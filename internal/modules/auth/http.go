package auth

import (
	"errors"
	"net"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type Handler struct{ service *Service }

func NewHandler(service *Service) *Handler { return &Handler{service: service} }

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.POST("/register", h.register)
	rg.POST("/login", h.login)
	rg.POST("/refresh", h.refresh)
	rg.POST("/logout", h.logout)
	rg.GET("/me", h.authRequired(), h.me)
	rg.GET("/menu", h.authRequired(), h.menu)
	rg.GET("/api-keys", h.authRequired(), h.apiKeys)
	rg.POST("/api-keys", h.authRequired(), h.createAPIKey)
	rg.GET("/api-keys/audit", h.authRequired(), h.apiKeyAudit)
	rg.POST("/api-keys/:id/revoke", h.authRequired(), h.revokeAPIKey)
}

func (h *Handler) register(c *gin.Context) {
	var input RegisterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效"})
		return
	}
	session, err := h.service.Register(c.Request.Context(), input)
	if err != nil {
		status := http.StatusBadRequest
		if err == ErrUserExists {
			status = http.StatusConflict
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, session)
}

func (h *Handler) login(c *gin.Context) {
	var input LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效"})
		return
	}
	session, err := h.service.Login(c.Request.Context(), input)
	if err != nil {
		if err.Error() == "邮箱或密码错误" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "邮箱或密码错误"})
			return
		}
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, session)
}

func (h *Handler) refresh(c *gin.Context) {
	var input RefreshInput
	if err := c.ShouldBindJSON(&input); err != nil || strings.TrimSpace(input.RefreshToken) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 refresh token"})
		return
	}
	session, err := h.service.Refresh(c.Request.Context(), input)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, session)
}

func (h *Handler) logout(c *gin.Context) {
	var input RefreshInput
	if err := c.ShouldBindJSON(&input); err != nil || strings.TrimSpace(input.RefreshToken) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 refresh token"})
		return
	}
	if err := h.service.Logout(c.Request.Context(), input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "当前会话已退出"})
}

func (h *Handler) me(c *gin.Context) {
	user := c.MustGet("currentUser").(User)
	c.JSON(http.StatusOK, gin.H{"user": user, "permissions": h.service.PermissionsForRole(user.Role)})
}

func (h *Handler) menu(c *gin.Context) {
	user := c.MustGet("currentUser").(User)
	c.JSON(http.StatusOK, gin.H{
		"items":       h.service.MenuForRole(user.Role),
		"role":        user.Role,
		"permissions": h.service.PermissionsForRole(user.Role),
	})
}

func (h *Handler) authRequiredForAPIKeyScope(requiredScope string) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := strings.TrimSpace(c.GetHeader("X-API-Key"))
		if key == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "缺少 API Key"})
			return
		}
		clientIP := requestClientIP(c)
		user, apiKey, err := h.service.AuthenticateAPIKey(c.Request.Context(), key, clientIP, requiredScope)
		if err != nil {
			status := http.StatusUnauthorized
			if errors.Is(err, ErrAPIKeyDeniedIP) || errors.Is(err, ErrAPIKeyDeniedScope) {
				status = http.StatusForbidden
			}
			c.AbortWithStatusJSON(status, gin.H{"error": err.Error()})
			return
		}
		c.Set("currentUser", user)
		c.Set("currentAPIKey", apiKey)
		c.Next()
	}
}

func requestClientIP(c *gin.Context) string {
	remoteAddr := strings.TrimSpace(c.Request.RemoteAddr)
	if host, _, err := net.SplitHostPort(remoteAddr); err == nil {
		return host
	}
	return remoteAddr
}

func (h *Handler) authRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := strings.TrimSpace(c.GetHeader("Authorization"))
		if len(authHeader) < len("Bearer ") || !strings.EqualFold(authHeader[:len("Bearer ")], "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "缺少认证令牌"})
			return
		}
		token := strings.TrimSpace(authHeader[len("Bearer "):])
		user, err := h.service.ParseToken(c.Request.Context(), token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		c.Set("currentUser", user)
		c.Next()
	}
}

func RequireRoles(roles ...Role) gin.HandlerFunc {
	allowed := map[Role]struct{}{}
	for _, role := range roles {
		allowed[role] = struct{}{}
	}
	return func(c *gin.Context) {
		user, ok := c.Get("currentUser")
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "未登录"})
			return
		}
		current := user.(User)
		if _, exists := allowed[current.Role]; !exists {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "无权限访问"})
			return
		}
		c.Next()
	}
}
