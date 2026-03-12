package http

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"gym-mvp/backend/internal/config"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type apiServer struct {
	cfg *config.Config
	db  *pgxpool.Pool
}

type contextKey string

const userIDKey contextKey = "user_id"

type bookingRequest struct {
	SessionID string `json:"session_id"`
}

type apiResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

func NewServer(cfg *config.Config) *http.Server {
	db, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		panic(fmt.Errorf("db connect failed: %w", err))
	}

	api := &apiServer{cfg: cfg, db: db}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", api.health)
	mux.HandleFunc("POST /bookings", api.requireAuth(api.bookClass))
	mux.HandleFunc("POST /bookings/cancel", api.requireAuth(api.cancelBooking))

	return &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      cors(mux),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}
}

func (s *apiServer) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, apiResponse{Success: true, Message: "ok"})
}

func (s *apiServer) requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			writeJSON(w, http.StatusUnauthorized, apiResponse{Success: false, Message: "missing Authorization header"})
			return
		}

		token := strings.TrimPrefix(authHeader, "Bearer ")
		if token == authHeader {
			writeJSON(w, http.StatusUnauthorized, apiResponse{Success: false, Message: "invalid bearer token"})
			return
		}

		claims := jwt.RegisteredClaims{}
		_, err := jwt.ParseWithClaims(token, &claims, func(parsed *jwt.Token) (any, error) {
			if parsed.Method.Alg() != jwt.SigningMethodHS256.Alg() {
				return nil, errors.New("unexpected signing method")
			}
			return []byte(s.cfg.SupabaseJWTSecret), nil
		})
		if err != nil || claims.Subject == "" {
			writeJSON(w, http.StatusUnauthorized, apiResponse{Success: false, Message: "invalid token"})
			return
		}

		ctx := context.WithValue(r.Context(), userIDKey, claims.Subject)
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}

func (s *apiServer) bookClass(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(userIDKey).(string)
	if !ok || userID == "" {
		writeJSON(w, http.StatusUnauthorized, apiResponse{Success: false, Message: "unauthorized"})
		return
	}

	var req bookingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.SessionID == "" {
		writeJSON(w, http.StatusBadRequest, apiResponse{Success: false, Message: "session_id is required"})
		return
	}

	tx, err := s.db.Begin(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, apiResponse{Success: false, Message: "could not start transaction"})
		return
	}
	defer tx.Rollback(r.Context())

	var scheduledAt time.Time
	var capacity int
	if err := tx.QueryRow(
		r.Context(),
		`select scheduled_at, capacity from class_sessions where id = $1 and status = 'scheduled' for update`,
		req.SessionID,
	).Scan(&scheduledAt, &capacity); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeJSON(w, http.StatusNotFound, apiResponse{Success: false, Message: "class session not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, apiResponse{Success: false, Message: "could not load session"})
		return
	}

	var bookedCount int
	if err := tx.QueryRow(
		r.Context(),
		`select count(*)::int from bookings where session_id = $1 and status = 'confirmed'`,
		req.SessionID,
	).Scan(&bookedCount); err != nil {
		writeJSON(w, http.StatusInternalServerError, apiResponse{Success: false, Message: "could not check capacity"})
		return
	}

	if bookedCount >= capacity {
		writeJSON(w, http.StatusConflict, apiResponse{Success: false, Message: "class is full"})
		return
	}

	_, err = tx.Exec(
		r.Context(),
		`insert into bookings (user_id, session_id, status)
		 values ($1, $2, 'confirmed')
		 on conflict (user_id, session_id)
		 do update set status = 'confirmed', cancelled_at = null`,
		userID,
		req.SessionID,
	)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, apiResponse{Success: false, Message: "could not create booking"})
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeJSON(w, http.StatusInternalServerError, apiResponse{Success: false, Message: "could not commit booking"})
		return
	}

	_ = scheduledAt
	writeJSON(w, http.StatusOK, apiResponse{Success: true, Message: "Booking confirmed"})
}

func (s *apiServer) cancelBooking(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(userIDKey).(string)
	if !ok || userID == "" {
		writeJSON(w, http.StatusUnauthorized, apiResponse{Success: false, Message: "unauthorized"})
		return
	}

	var req bookingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.SessionID == "" {
		writeJSON(w, http.StatusBadRequest, apiResponse{Success: false, Message: "session_id is required"})
		return
	}

	var scheduledAt time.Time
	if err := s.db.QueryRow(
		r.Context(),
		`select cs.scheduled_at
		 from class_sessions cs
		 join bookings b on b.session_id = cs.id
		 where cs.id = $1 and b.user_id = $2 and b.status = 'confirmed'`,
		req.SessionID,
		userID,
	).Scan(&scheduledAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeJSON(w, http.StatusNotFound, apiResponse{Success: false, Message: "active booking not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, apiResponse{Success: false, Message: "could not load booking"})
		return
	}

	if time.Until(scheduledAt) <= 2*time.Hour {
		writeJSON(w, http.StatusLocked, apiResponse{Success: false, Message: "cancellation window closed"})
		return
	}

	_, err := s.db.Exec(
		r.Context(),
		`update bookings
		 set status = 'cancelled', cancelled_at = now()
		 where user_id = $1 and session_id = $2 and status = 'confirmed'`,
		userID,
		req.SessionID,
	)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, apiResponse{Success: false, Message: "could not cancel booking"})
		return
	}

	writeJSON(w, http.StatusOK, apiResponse{Success: true, Message: "Booking cancelled"})
}

func writeJSON(w http.ResponseWriter, status int, payload apiResponse) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
