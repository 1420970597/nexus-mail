package auth

import "github.com/gin-gonic/gin"

func (h *Handler) AuthRequiredForRoutes() gin.HandlerFunc {
	return h.authRequired()
}

func (h *Handler) AuthRequiredForAPIKeyScope(requiredScope string) gin.HandlerFunc {
	return h.authRequiredForAPIKeyScope(requiredScope)
}
