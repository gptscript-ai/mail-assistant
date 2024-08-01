package auth

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"sync"
	"time"

	"ethan/pkg/db"
	"ethan/pkg/mstoken"
	"github.com/google/uuid"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	_ "github.com/lib/pq"
	msgraphsdk "github.com/microsoftgraph/msgraph-sdk-go"
	"github.com/sirupsen/logrus"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/microsoft"
)

var (
	JwtTokenName = "jwt-token"

	oauthConfig = &oauth2.Config{
		ClientID:     os.Getenv("MICROSOFT_CLIENT_ID"),
		ClientSecret: os.Getenv("MICROSOFT_CLIENT_SECRET"),
		RedirectURL:  fmt.Sprintf("%v/api/auth/callback", getPublicURL()),
		Scopes:       []string{"User.Read", "Mail.ReadWrite", "Mail.Send", "Contacts.Read", "Calendars.ReadWrite", "People.Read", "offline_access"},
		Endpoint:     microsoft.AzureADEndpoint(os.Getenv("MICROSOFT_TENANT_ID")),
	}
	jwtKey = []byte(os.Getenv("MICROSOFT_JWT_KEY"))
)

type StateStore struct {
	states map[string]time.Time
	mutex  sync.RWMutex
}

func getPublicURL() string {
	if os.Getenv("DEVELOPMENT") == "true" {
		return "http://localhost:8080"
	}
	return os.Getenv("PUBLIC_URL")
}

func NewStateStore() *StateStore {
	return &StateStore{
		states: make(map[string]time.Time),
	}
}

func (s *StateStore) Add(state string) {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	s.states[state] = time.Now().Add(15 * time.Minute)
}

func (s *StateStore) Validate(state string) bool {
	s.mutex.RLock()
	defer s.mutex.RUnlock()
	expiry, exists := s.states[state]
	if !exists {
		return false
	}
	if time.Now().After(expiry) {
		delete(s.states, state)
		return false
	}
	delete(s.states, state)
	return true
}

func generateState() (string, error) {
	b := make([]byte, 32)
	_, err := rand.Read(b)
	if err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}

type Handler struct {
	queries *db.Queries
	states  *StateStore
}

func NewHandler(queries *db.Queries) *Handler {
	return &Handler{
		queries: queries,
		states:  NewStateStore(),
	}
}

func (h *Handler) HandleMicrosoftLogin(w http.ResponseWriter, r *http.Request) {
	state, err := generateState()
	if err != nil {
		fmt.Fprint(w, err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	h.states.Add(state)
	url := oauthConfig.AuthCodeURL(state)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

func (h *Handler) HandleMe(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	var uid pgtype.UUID
	if err := uid.Scan(userID); err != nil {
		fmt.Fprint(w, fmt.Errorf("invalid user id: %s", userID))
		return
	}

	user, err := h.queries.GetUser(r.Context(), uid)
	if err != nil {
		fmt.Fprint(w, fmt.Errorf("failed to get user: %s", userID))
		return
	}

	if err := json.NewEncoder(w).Encode(user); err != nil {
		fmt.Fprint(w, fmt.Errorf("failed to encode user: %s", userID))
		return
	}

	return
}

func (h *Handler) HandleMicrosoftCallback(w http.ResponseWriter, r *http.Request) {
	user, err := h.saveUserInfo(r.Context(), r.FormValue("state"), r.FormValue("code"))
	if err != nil {
		fmt.Fprint(w, fmt.Errorf("failed to save user info: %w", err))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	jwtToken, err := createJWT(user)
	if err != nil {
		fmt.Fprint(w, fmt.Errorf("failed to create jwt token: %w", err))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	cookie := &http.Cookie{
		Name:     JwtTokenName,
		Value:    jwtToken,
		Expires:  time.Now().Add(time.Hour * 24),
		SameSite: http.SameSiteDefaultMode,
		Path:     "/",
	}

	http.SetCookie(w, cookie)
	http.Redirect(w, r, "/", http.StatusTemporaryRedirect)
	return
}

func (h *Handler) saveUserInfo(ctx context.Context, state string, code string) (db.User, error) {
	if !h.states.Validate(state) {
		return db.User{}, fmt.Errorf("invalid oauth state")
	}

	token, err := oauthConfig.Exchange(ctx, code)
	if err != nil {
		return db.User{}, fmt.Errorf("code exchange failed: %s", err.Error())
	}

	cred := mstoken.NewStaticTokenCredential(token.AccessToken)
	client, err := msgraphsdk.NewGraphServiceClientWithCredentials(cred, []string{})
	if err != nil {
		return db.User{}, fmt.Errorf("failed to construct ms client: %s", err.Error())
	}

	me, err := client.Me().Get(ctx, nil)
	if err != nil {
		return db.User{}, fmt.Errorf("failed to get me client: %s", err.Error())
	}

	email := me.GetMail()
	t := pgtype.Timestamptz{}
	if err := t.Scan(token.Expiry); err != nil {
		return db.User{}, fmt.Errorf("failed to scan token for expiry time: %w", err)
	}

	user, err := h.queries.GetUserFromEmail(ctx, *email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			newUser, err := h.queries.CreateUser(ctx, db.CreateUserParams{
				Name:         *me.GetDisplayName(),
				Email:        *email,
				ExpireAt:     t,
				Token:        token.AccessToken,
				RefreshToken: &token.RefreshToken,
			})
			if err != nil {
				return db.User{}, fmt.Errorf("failed to create user: %w", err)
			}
			logrus.Info("User created")
			return newUser, nil
		}
		return db.User{}, fmt.Errorf("failed to get user: %w", err)
	} else {
		if err := h.queries.UpdateUser(ctx, db.UpdateUserParams{
			ID:                   user.ID,
			Token:                token.AccessToken,
			RefreshToken:         &token.RefreshToken,
			ExpireAt:             t,
			SubscriptionID:       user.SubscriptionID,
			SubscriptionExpireAt: user.SubscriptionExpireAt,
			SubscriptionDisabled: user.SubscriptionDisabled,
			CheckSpam:            user.CheckSpam,
		}); err != nil {
			return db.User{}, fmt.Errorf("failed to update user token: %w", err)
		}
		logrus.Infof("User %v updated", uuid.UUID(user.ID.Bytes).String())
	}
	return user, nil
}

func createJWT(user db.User) (string, error) {
	claims := jwt.MapClaims{
		"sub":   user.ID,
		"name":  user.Name,
		"email": user.Email,
		"exp":   time.Now().Add(time.Hour * 24).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtKey)
}
