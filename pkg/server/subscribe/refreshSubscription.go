package subscribe

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"ethan/pkg/db"
	"ethan/pkg/mstoken"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	msgraphsdk "github.com/microsoftgraph/msgraph-sdk-go"
	graphmodels "github.com/microsoftgraph/msgraph-sdk-go/models"
	"github.com/microsoftgraph/msgraph-sdk-go/models/odataerrors"
	"github.com/sirupsen/logrus"
)

func PerUser(ctx context.Context, queries *db.Queries) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	if err := ensureSubscriptions(ctx, queries); err != nil {
		logrus.Error(fmt.Errorf("failed to ensure subscriptions: %w", err))
	}

	for {
		select {
		case <-ticker.C:
			if err := ensureSubscriptions(ctx, queries); err != nil {
				logrus.Error(fmt.Errorf("failed to ensure subscriptions: %w", err))
				continue
			}
		}
	}
}

func ensureSubscriptions(ctx context.Context, queries *db.Queries) error {
	users, err := queries.ListUsers(ctx)
	if err != nil {
		return err
	}
	for _, user := range users {
		if err := ensureSubscriptionsForUser(ctx, user, queries); err != nil {
			return err
		}
	}
	return nil
}

func ensureSubscriptionsForUser(ctx context.Context, user db.User, queries *db.Queries) error {
	if user.SubscriptionDisabled != nil && *user.SubscriptionDisabled {
		if user.SubscriptionID != nil {
			cred := mstoken.NewStaticTokenCredential(user.Token)
			client, err := msgraphsdk.NewGraphServiceClientWithCredentials(cred, []string{})
			if err != nil {
				return err
			}

			if err := client.Subscriptions().BySubscriptionId(*user.SubscriptionID).Delete(ctx, nil); err != nil {
				var e *odataerrors.ODataError
				switch {
				case errors.As(err, &e):
					if e.ApiError.ResponseStatusCode == 404 {
						break
					}
				default:
					return err
				}
			}
			logrus.Infof("Subscription %v deleted for user %v", *user.SubscriptionID, uuid.UUID(user.ID.Bytes).String())
			if err := queries.UpdateUser(ctx, db.UpdateUserParams{
				ID:                   user.ID,
				Token:                user.Token,
				RefreshToken:         user.RefreshToken,
				ExpireAt:             user.ExpireAt,
				SubscriptionID:       nil,
				SubscriptionExpireAt: pgtype.Timestamptz{},
				SubscriptionDisabled: user.SubscriptionDisabled,
				CheckSpam:            user.CheckSpam,
			}); err != nil {
				return err
			}
		}
	} else if user.SubscriptionID == nil || (user.SubscriptionExpireAt.Valid && user.SubscriptionExpireAt.Time.Before(time.Now())) {
		subscriptionID, expireTime, err := createSubscription(ctx, user)
		if err != nil {
			return err
		}
		var t pgtype.Timestamptz
		if err := t.Scan(expireTime); err != nil {
			return err
		}
		if err := queries.UpdateUser(ctx, db.UpdateUserParams{
			ID:                   user.ID,
			Token:                user.Token,
			RefreshToken:         user.RefreshToken,
			ExpireAt:             user.ExpireAt,
			SubscriptionID:       &subscriptionID,
			SubscriptionExpireAt: t,
			SubscriptionDisabled: user.SubscriptionDisabled,
			CheckSpam:            user.CheckSpam,
		}); err != nil {
			return err
		}
		logrus.Infof("User %v updated with new subscription ID %v", uuid.UUID(user.ID.Bytes).String(), subscriptionID)
	}
	return nil
}

func createSubscription(ctx context.Context, user db.User) (string, time.Time, error) {
	cred := mstoken.NewStaticTokenCredential(user.Token)
	client, err := msgraphsdk.NewGraphServiceClientWithCredentials(cred, []string{})
	if err != nil {
		return "", time.Time{}, err
	}

	parts := strings.Split(os.Getenv("EMAIL_RECIPIENT"), ",")
	var recipients []string
	for _, part := range parts {
		recipients = append(recipients, strings.TrimSpace(part))
	}

	requestBody := graphmodels.NewSubscription()
	changeType := "created"
	requestBody.SetChangeType(&changeType)
	notificationUrl := os.Getenv("PUBLIC_URL") + "/api/webhook"
	requestBody.SetNotificationUrl(&notificationUrl)
	resource := "me/mailFolders('Inbox')/messages"
	requestBody.SetResource(&resource)
	expirationDateTime := time.Now().Add(time.Hour * 24)
	requestBody.SetExpirationDateTime(&expirationDateTime)

	subscription, err := client.Subscriptions().Post(ctx, requestBody, nil)
	if err != nil {
		return "", time.Time{}, err
	}
	return *subscription.GetId(), expirationDateTime, nil
}
