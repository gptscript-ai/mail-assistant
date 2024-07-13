package auth

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"ethan/pkg/db"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/sirupsen/logrus"
)

func (h *Handler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	var uid pgtype.UUID
	if err := uid.Scan(userID); err != nil {
		fmt.Fprint(w, fmt.Errorf("invalid user id: %s", userID))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	user, err := h.queries.GetUser(r.Context(), uid)
	if err != nil {
		fmt.Fprint(w, fmt.Errorf("invalid user id: %s", userID))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	var userParam db.UpdateUserParams
	data, err := io.ReadAll(r.Body)
	if err != nil {
		logrus.Error(fmt.Errorf("failed to fetch tasks from database: %w", err))
		return
	}
	if len(data) != 0 {
		if err := json.Unmarshal(data, &userParam); err != nil {
			logrus.Error(fmt.Errorf("failed to unmarshal tasks from request body: %w", err))
			return
		}
	}
	userParam.RefreshToken = user.RefreshToken
	userParam.Token = user.Token
	userParam.ExpireAt = user.ExpireAt
	userParam.SubscriptionExpireAt = user.SubscriptionExpireAt
	userParam.SubscriptionID = user.SubscriptionID
	userParam.ID = uid

	if err := h.queries.UpdateUser(r.Context(), userParam); err != nil {
		logrus.Error(fmt.Errorf("failed to update user: %w", err))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	return
}
