package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"ethan/pkg/db"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/sirupsen/logrus"
)

func RefreshToken(ctx context.Context, queries *db.Queries) {
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			users, err := queries.ListUsers(ctx)
			if err != nil {
				logrus.Error(err)
				continue
			}
			for _, user := range users {
				if user.ExpireAt.Valid && user.ExpireAt.Time.After(time.Now()) {
					continue
				} else if user.RefreshToken != nil {
					token, err := refreshToken(ctx, *user.RefreshToken)
					if err != nil {
						logrus.Error(err)
						continue
					}

					if token.RefreshToken == "" {
						continue
					}

					t := pgtype.Timestamptz{}
					if err := t.Scan(time.Now().Add(time.Second * time.Duration(token.ExpiresIn))); err != nil {
						logrus.Error(err)
						continue
					}
					if err := queries.UpdateUser(ctx, db.UpdateUserParams{
						ID:                   user.ID,
						Token:                token.AccessToken,
						RefreshToken:         &token.RefreshToken,
						ExpireAt:             t,
						SubscriptionID:       user.SubscriptionID,
						SubscriptionExpireAt: user.SubscriptionExpireAt,
						SubscriptionDisabled: user.SubscriptionDisabled,
						CheckSpam:            user.CheckSpam,
					}); err != nil {
						logrus.Error(fmt.Errorf("failed to update user after token refresh: %w", err))
						continue
					}
					logrus.Infof("User %v updated, token refreshed at %v", uuid.UUID(user.ID.Bytes).String(), time.Now())
				}
			}
		}
	}
}

type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"`
}

func refreshToken(ctx context.Context, refreshToken string) (TokenResponse, error) {
	tokenEndpoint := fmt.Sprintf("https://login.microsoftonline.com/%s/oauth2/v2.0/token", os.Getenv("MICROSOFT_TENANT_ID"))

	data := url.Values{}
	data.Set("client_id", oauthConfig.ClientID)
	data.Set("scope", strings.Join(oauthConfig.Scopes, " "))
	data.Set("refresh_token", refreshToken)
	data.Set("grant_type", "refresh_token")
	data.Set("client_secret", oauthConfig.ClientSecret)

	req, err := http.NewRequestWithContext(ctx, "POST", tokenEndpoint, bytes.NewBufferString(data.Encode()))
	if err != nil {
		return TokenResponse{}, err
	}
	req.Header.Add("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return TokenResponse{}, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return TokenResponse{}, err
	}

	if resp.StatusCode != http.StatusOK {
		return TokenResponse{}, fmt.Errorf("refresh token error: %s", string(body))
	}

	var token TokenResponse
	if err := json.Unmarshal(body, &token); err != nil {
		return TokenResponse{}, err
	}

	return token, nil
}
