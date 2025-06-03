package images

import (
	"context"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"chat-app-server/db"
	"chat-app-server/s3store"
	"chat-app-server/util"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ImageHandler struct {
	store s3store.Store
	db    *db.Queries
	ctx   context.Context
	conn  *pgxpool.Pool
}

func NewImageHandler(store s3store.Store, db *db.Queries, ctx context.Context, conn *pgxpool.Pool) *ImageHandler {
	return &ImageHandler{
		store: store,
		db:    db,
		ctx:   ctx,
		conn:  conn,
	}
}

type presignUploadReq struct {
	Filename string `json:"filename" binding:"required"`
	Expires  int    `json:"expires"`
}

type presignUploadRes struct {
	UploadURL string `json:"uploadUrl"`
	ObjectKey string `json:"objectKey"`
}

func getSafeExtension(filename string) string {
	base := filepath.Base(filename)

	ext := filepath.Ext(base)
	ext = strings.ToLower(ext)

	allowedExtensions := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".gif":  true,
		".webp": true,
	}

	if ext == "" || !allowedExtensions[ext] {
		return ""
	}
	return ext
}

func (h *ImageHandler) PresignUpload(c *gin.Context) {
	user, err := util.GetUser(c, h.db)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found or unauthorized"})
		return
	}
	ctx := c.Request.Context()
	var req presignUploadReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request: " + err.Error()})
		return
	}

	ext := getSafeExtension(req.Filename)

	if req.Filename != "" && ext == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Filename must have a valid and supported extension (e.g., .jpg, .png)."})
		return
	}

	s3KeyPrefix := fmt.Sprintf("users/%s/uploads/", user.ID.String())

	s3ObjectUUID := uuid.New().String()
	s3Key := s3KeyPrefix + s3ObjectUUID + ext

	expiresDuration := time.Duration(req.Expires) * time.Second
	if req.Expires <= 0 {
		expiresDuration = 15 * time.Minute
	}
	maxExpiration := 1 * time.Hour
	if expiresDuration > maxExpiration {
		expiresDuration = maxExpiration
	}

	uploadURL, err := h.store.PresignUpload(ctx, s3Key, expiresDuration)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Could not generate presigned URL: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, presignUploadRes{
		UploadURL: uploadURL,
		ObjectKey: s3Key,
	})
}
