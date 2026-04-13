package auth

import "github.com/gin-gonic/gin"

func (h *Handler) AuthRequiredForRoutes() gin.HandlerFunc {
	return h.authRequired()
}
