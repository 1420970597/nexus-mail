package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type authRepository interface {
	Create(ctx context.Context, email, password string, role Role) (User, error)
	FindByEmail(ctx context.Context, email string) (User, error)
	FindByID(ctx context.Context, id int64) (User, error)
	CreateRefreshSession(ctx context.Context, sessionID string, userID int64, refreshToken string, expiresAt time.Time) error
	IsRefreshSessionActive(ctx context.Context, sessionID string, refreshToken string) (bool, error)
	IsSessionActive(ctx context.Context, sessionID string) (bool, error)
	RevokeRefreshSession(ctx context.Context, sessionID string) error
}

type Service struct {
	authRepo          authRepository
	apiKeyRepo        apiKeyRepository
	apiKeyRateLimiter APIKeyRateLimiter
	jwtSecret         string
	tokenExpire       time.Duration
	refreshExpire     time.Duration
	mu                sync.Mutex
	revokedSessionIDs map[string]struct{}
}

func NewService(authRepo authRepository, apiKeyRepo apiKeyRepository, jwtSecret string, tokenExpire, refreshExpire time.Duration) *Service {
	if authRepo == nil {
		if candidate, ok := any(apiKeyRepo).(authRepository); ok {
			authRepo = candidate
		}
	}
	if apiKeyRepo == nil {
		if candidate, ok := any(authRepo).(apiKeyRepository); ok {
			apiKeyRepo = candidate
		}
	}
	return &Service{
		authRepo:          authRepo,
		apiKeyRepo:        apiKeyRepo,
		jwtSecret:         jwtSecret,
		tokenExpire:       tokenExpire,
		refreshExpire:     refreshExpire,
		revokedSessionIDs: map[string]struct{}{},
	}
}

func (s *Service) SetAPIKeyRateLimiter(limiter APIKeyRateLimiter) {
	if s == nil {
		return
	}
	s.apiKeyRateLimiter = limiter
}

func (s *Service) Register(ctx context.Context, input RegisterInput) (Session, error) {
	if err := validateCredentials(input.Email, input.Password); err != nil {
		return Session{}, err
	}
	user, err := s.authRepo.Create(ctx, input.Email, input.Password, RoleUser)
	if err != nil {
		return Session{}, err
	}
	return s.buildSession(ctx, user)
}

func (s *Service) Login(ctx context.Context, input LoginInput) (Session, error) {
	if err := validateCredentials(input.Email, input.Password); err != nil {
		return Session{}, err
	}
	user, err := s.authRepo.FindByEmail(ctx, input.Email)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			return Session{}, errors.New("邮箱或密码错误")
		}
		return Session{}, err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		return Session{}, errors.New("邮箱或密码错误")
	}
	return s.buildSession(ctx, user)
}

func (s *Service) Refresh(ctx context.Context, input RefreshInput) (Session, error) {
	refreshToken := strings.TrimSpace(input.RefreshToken)
	if refreshToken == "" {
		return Session{}, errors.New("缺少 refresh token")
	}
	user, sessionID, err := s.parseTokenClaimsByType(ctx, refreshToken, "refresh")
	if err != nil {
		return Session{}, err
	}
	active, err := s.isRefreshSessionActive(ctx, sessionID, refreshToken)
	if err != nil {
		return Session{}, err
	}
	if !active {
		return Session{}, errors.New("refresh token 已失效")
	}
	if err := s.revokeRefreshSession(ctx, sessionID); err != nil {
		return Session{}, err
	}
	return s.buildSession(ctx, user)
}

func (s *Service) Logout(ctx context.Context, input RefreshInput) error {
	refreshToken := strings.TrimSpace(input.RefreshToken)
	if refreshToken == "" {
		return errors.New("缺少 refresh token")
	}
	_, sessionID, err := s.parseTokenClaimsByType(ctx, refreshToken, "refresh")
	if err != nil {
		return err
	}
	return s.revokeRefreshSession(ctx, sessionID)
}

func (s *Service) ParseToken(ctx context.Context, tokenString string) (User, error) {
	user, _, err := s.parseTokenClaimsByType(ctx, tokenString, "access")
	return user, err
}

func (s *Service) PermissionsForRole(role Role) []Permission {
	permissions := rolePermissions[role]
	copied := make([]Permission, len(permissions))
	copy(copied, permissions)
	return copied
}

func (s *Service) MenuForRole(role Role) []MenuItem {
	items := []MenuItem{
		{Key: "dashboard", Label: "仪表盘", Path: "/"},
		{Key: "projects", Label: "项目市场", Path: "/projects"},
		{Key: "orders", Label: "订单中心", Path: "/orders"},
		{Key: "balance", Label: "余额中心", Path: "/balance"},
		{Key: "profile", Label: "个人资料", Path: "/profile"},
		{Key: "api-keys", Label: "API Keys", Path: "/api-keys"},
		{Key: "webhooks", Label: "Webhook 设置", Path: "/webhooks"},
		{Key: "settings", Label: "设置中心", Path: "/settings"},
	}
	if role == RoleSupplier || role == RoleAdmin {
		items = append(items,
			MenuItem{Key: "supplier-domains", Label: "域名管理", Path: "/supplier/domains"},
			MenuItem{Key: "supplier-resources", Label: "供应商资源", Path: "/supplier/resources"},
			MenuItem{Key: "supplier-offerings", Label: "供货规则", Path: "/supplier/offerings"},
			MenuItem{Key: "supplier-settlements", Label: "供应商结算", Path: "/supplier/settlements"},
		)
	}
	if role == RoleAdmin {
		items = append(items,
			MenuItem{Key: "admin-users", Label: "用户管理", Path: "/admin/users"},
			MenuItem{Key: "admin-suppliers", Label: "供应商管理", Path: "/admin/suppliers"},
			MenuItem{Key: "admin-pricing", Label: "价格策略", Path: "/admin/pricing"},
			MenuItem{Key: "admin-risk", Label: "风控中心", Path: "/admin/risk"},
			MenuItem{Key: "admin-audit", Label: "审计日志", Path: "/admin/audit"},
		)
	}
	items = append(items, MenuItem{Key: "docs", Label: "API 文档", Path: "/docs"})
	return items
}

func (s *Service) buildSession(ctx context.Context, user User) (Session, error) {
	sessionID, err := generateTokenID()
	if err != nil {
		return Session{}, err
	}
	token, err := s.issueToken(user, sessionID)
	if err != nil {
		return Session{}, err
	}
	refreshToken, expiresAt, err := s.issueRefreshToken(user, sessionID)
	if err != nil {
		return Session{}, err
	}
	if err := s.storeRefreshSession(ctx, sessionID, user.ID, refreshToken, expiresAt); err != nil {
		return Session{}, err
	}
	return Session{Token: token, RefreshToken: refreshToken, User: sanitizeUser(user)}, nil
}

func (s *Service) parseTokenClaimsByType(ctx context.Context, tokenString, expectedType string) (User, string, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if token.Method != jwt.SigningMethodHS256 {
			return nil, errors.New("签名算法无效")
		}
		return []byte(s.jwtSecret), nil
	})
	if err != nil || !token.Valid {
		return User{}, "", errors.New("无效令牌")
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return User{}, "", errors.New("无效令牌")
	}
	if tokenType, _ := claims["type"].(string); tokenType != expectedType {
		return User{}, "", errors.New("令牌类型不匹配")
	}
	uid, ok := claims["uid"].(float64)
	if !ok {
		return User{}, "", errors.New("无效令牌")
	}
	email, ok := claims["email"].(string)
	if !ok {
		return User{}, "", errors.New("无效令牌")
	}
	role, ok := claims["role"].(string)
	if !ok {
		return User{}, "", errors.New("无效令牌")
	}
	sessionID, ok := claims["jti"].(string)
	if !ok || strings.TrimSpace(sessionID) == "" {
		return User{}, "", errors.New("缺少会话标识")
	}
	user := User{ID: int64(uid), Email: email, Role: Role(role)}
	if expectedType == "access" {
		active, activeErr := s.isAccessSessionActive(ctx, sessionID)
		if activeErr != nil {
			return User{}, "", activeErr
		}
		if !active {
			return User{}, "", errors.New("会话已失效")
		}
	}
	if s.authRepo != nil {
		storedUser, lookupErr := s.authRepo.FindByID(ctx, user.ID)
		if lookupErr != nil {
			return User{}, "", errors.New("用户不存在")
		}
		user = sanitizeUser(storedUser)
	}
	return user, sessionID, nil
}

func (s *Service) issueToken(user User, sessionID string) (string, error) {
	token, _, err := s.signToken(user, "access", sessionID, s.tokenExpire)
	return token, err
}

func (s *Service) issueRefreshToken(user User, sessionID string) (string, time.Time, error) {
	return s.signToken(user, "refresh", sessionID, s.refreshExpire)
}

func (s *Service) signToken(user User, tokenType string, sessionID string, expiry time.Duration) (string, time.Time, error) {
	now := time.Now().UTC()
	expiresAt := now.Add(expiry)
	claims := jwt.MapClaims{
		"uid":   user.ID,
		"email": user.Email,
		"role":  user.Role,
		"type":  tokenType,
		"jti":   sessionID,
		"exp":   expiresAt.Unix(),
		"iat":   now.Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return "", time.Time{}, err
	}
	return signed, expiresAt, nil
}

func (s *Service) storeRefreshSession(ctx context.Context, sessionID string, userID int64, refreshToken string, expiresAt time.Time) error {
	if s.authRepo != nil {
		return s.authRepo.CreateRefreshSession(ctx, sessionID, userID, hashToken(refreshToken), expiresAt)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.revokedSessionIDs, sessionID)
	return nil
}

func (s *Service) revokeRefreshSession(ctx context.Context, sessionID string) error {
	if s.authRepo != nil {
		return s.authRepo.RevokeRefreshSession(ctx, sessionID)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.revokedSessionIDs[sessionID] = struct{}{}
	return nil
}

func (s *Service) isRefreshSessionActive(ctx context.Context, sessionID string, refreshToken string) (bool, error) {
	if s.authRepo != nil {
		return s.authRepo.IsRefreshSessionActive(ctx, sessionID, hashToken(refreshToken))
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	_, exists := s.revokedSessionIDs[sessionID]
	return !exists, nil
}

func (s *Service) isAccessSessionActive(ctx context.Context, sessionID string) (bool, error) {
	if s.authRepo != nil {
		return s.authRepo.IsSessionActive(ctx, sessionID)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	_, exists := s.revokedSessionIDs[sessionID]
	return !exists, nil
}

func validateCredentials(email, password string) error {
	email = strings.TrimSpace(strings.ToLower(email))
	if email == "" || !strings.Contains(email, "@") {
		return errors.New("请输入有效邮箱")
	}
	if len(password) < 8 {
		return fmt.Errorf("密码长度至少为 8 位")
	}
	return nil
}

func sanitizeUser(user User) User {
	user.PasswordHash = ""
	return user
}

func generateTokenID() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("生成 token id 失败: %w", err)
	}
	return hex.EncodeToString(buf), nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
