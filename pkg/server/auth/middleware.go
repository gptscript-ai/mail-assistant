package auth

import (
	"errors"
	"net/http"
	"strings"

	"ethan/pkg/db"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

func Middleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tokenStr := getTokenFromRequest(r)
		if tokenStr == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		var claims jwt.MapClaims
		token, err := jwt.ParseWithClaims(tokenStr, &claims, func(token *jwt.Token) (interface{}, error) {
			return jwtKey, nil
		})

		if err != nil || !token.Valid {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		user, err := getUserFromTokenClaims(claims)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Set custom headers
		r.Header.Set("X-User-ID", user.ID.String())
		r.Header.Set("X-User-Name", user.Name)
		r.Header.Set("X-User-Email", user.Email)

		next.ServeHTTP(w, r)
	}
}

func getTokenFromRequest(r *http.Request) string {
	// Check Authorization header
	authHeader := r.Header.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		return strings.TrimPrefix(authHeader, "Bearer ")
	}

	// Check cookies
	cookie, err := r.Cookie("JwtTokenName")
	if err == nil {
		return cookie.Value
	}

	return ""
}

func getUserFromTokenClaims(claims jwt.MapClaims) (user db.User, err error) {
	sub, err := claims.GetSubject()
	if err != nil {
		return db.User{}, err
	}
	uid, err := uuid.Parse(sub)
	if err != nil {
		return db.User{}, errors.New("invalid user id, not a uuid")
	}
	name, ok := claims["name"]
	if !ok {
		return db.User{}, errors.New("no name in token")
	}
	nameString, ok := name.(string)
	if !ok {
		return db.User{}, errors.New("name in token is not string")
	}
	email, ok := claims["email"]
	if !ok {
		return db.User{}, errors.New("no email in token")
	}
	emailString, ok := email.(string)
	if !ok {
		return db.User{}, errors.New("email in token is not string")
	}

	return db.User{
		ID: uid,
		Name: nameString,
		Email: emailString,
	}, nil
}
