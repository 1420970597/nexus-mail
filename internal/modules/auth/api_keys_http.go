package auth

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func (h *Handler) apiKeys(c *gin.Context) {
	user := c.MustGet("currentUser").(User)
	items, err := h.service.ListAPIKeys(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) createAPIKey(c *gin.Context) {
	user := c.MustGet("currentUser").(User)
	var input CreateAPIKeyInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效"})
		return
	}
	item, plaintext, err := h.service.CreateAPIKey(c.Request.Context(), user.ID, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"api_key": item, "plaintext_key": plaintext})
}

func (h *Handler) updateAPIKeyWhitelist(c *gin.Context) {
	user := c.MustGet("currentUser").(User)
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的 API Key ID"})
		return
	}
	var input UpdateAPIKeyWhitelistInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效"})
		return
	}
	item, err := h.service.UpdateAPIKeyWhitelist(c.Request.Context(), user.ID, id, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"api_key": item})
}

func (h *Handler) revokeAPIKey(c *gin.Context) {
	user := c.MustGet("currentUser").(User)
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的 API Key ID"})
		return
	}
	item, err := h.service.RevokeAPIKey(c.Request.Context(), user.ID, id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"api_key": item})
}

func (h *Handler) apiKeyAudit(c *gin.Context) {
	user := c.MustGet("currentUser").(User)
	items, err := h.service.ListAPIKeyAudit(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}
