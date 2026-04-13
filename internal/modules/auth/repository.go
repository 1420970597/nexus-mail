package auth

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

var ErrUserExists = errors.New("user already exists")
var ErrUserNotFound = errors.New("user not found")

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository { return &Repository{pool: pool} }

func (r *Repository) EnsureSchema(ctx context.Context) error {
	_, err := r.pool.Exec(ctx, `
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  session_id TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL UNIQUE,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`)
	return err
}

func (r *Repository) SeedDevelopmentUsers(ctx context.Context, env string) error {
	if env != "development" {
		return nil
	}
	seed := []struct {
		email, password string
		role            Role
	}{
		{"admin@nexus-mail.local", "Admin123!", RoleAdmin},
		{"supplier@nexus-mail.local", "Supplier123!", RoleSupplier},
		{"user@nexus-mail.local", "User123!", RoleUser},
	}
	for _, item := range seed {
		if _, err := r.FindByEmail(ctx, item.email); err == nil {
			continue
		}
		if _, err := r.Create(ctx, item.email, item.password, item.role); err != nil && !errors.Is(err, ErrUserExists) {
			return err
		}
	}
	return nil
}

func (r *Repository) Create(ctx context.Context, email, password string, role Role) (User, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return User{}, err
	}
	var user User
	err = r.pool.QueryRow(ctx, `INSERT INTO users (email, password_hash, role) VALUES ($1,$2,$3) RETURNING id, email, password_hash, role, created_at`, strings.ToLower(strings.TrimSpace(email)), string(hash), role).
		Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Role, &user.CreatedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return User{}, ErrUserExists
		}
		return User{}, err
	}
	return user, nil
}

func (r *Repository) FindByEmail(ctx context.Context, email string) (User, error) {
	var user User
	err := r.pool.QueryRow(ctx, `SELECT id, email, password_hash, role, created_at FROM users WHERE email = $1`, strings.ToLower(strings.TrimSpace(email))).
		Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Role, &user.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrUserNotFound
	}
	return user, err
}

func (r *Repository) FindByID(ctx context.Context, id int64) (User, error) {
	var user User
	err := r.pool.QueryRow(ctx, `SELECT id, email, password_hash, role, created_at FROM users WHERE id = $1`, id).
		Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Role, &user.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrUserNotFound
	}
	return user, err
}

func (r *Repository) CreateRefreshSession(ctx context.Context, sessionID string, userID int64, refreshToken string, expiresAt time.Time) error {
	_, err := r.pool.Exec(ctx, `
INSERT INTO auth_sessions (session_id, user_id, refresh_token, expires_at)
VALUES ($1, $2, $3, $4)
ON CONFLICT (session_id) DO UPDATE
SET user_id = EXCLUDED.user_id,
    refresh_token = EXCLUDED.refresh_token,
    expires_at = EXCLUDED.expires_at,
    revoked_at = NULL
`, sessionID, userID, refreshToken, expiresAt)
	return err
}

func (r *Repository) IsRefreshSessionActive(ctx context.Context, sessionID string, refreshToken string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `
SELECT EXISTS(
  SELECT 1
  FROM auth_sessions
  WHERE session_id = $1
    AND refresh_token = $2
    AND revoked_at IS NULL
    AND expires_at > NOW()
)
`, sessionID, refreshToken).Scan(&exists)
	return exists, err
}

func (r *Repository) IsSessionActive(ctx context.Context, sessionID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `
SELECT EXISTS(
  SELECT 1
  FROM auth_sessions
  WHERE session_id = $1
    AND revoked_at IS NULL
    AND expires_at > NOW()
)
`, sessionID).Scan(&exists)
	return exists, err
}

func (r *Repository) RevokeRefreshSession(ctx context.Context, sessionID string) error {
	_, err := r.pool.Exec(ctx, `
UPDATE auth_sessions
SET revoked_at = NOW()
WHERE session_id = $1 AND revoked_at IS NULL
`, sessionID)
	return err
}
