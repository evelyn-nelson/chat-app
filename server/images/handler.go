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

func NewImageHandler(
	store s3store.Store,
	db *db.Queries,
	ctx context.Context,
	conn *pgxpool.Pool,
) *ImageHandler {
	return &ImageHandler{
		store: store,
		db:    db,
		ctx:   ctx,
		conn:  conn,
	}
}

type presignUploadReq struct {
	Filename string    `json:"filename" binding:"required"`
	GroupID  uuid.UUID `json:"groupId" binding:"required"`
	Expires  int       `json:"expires"`
}

type presignUploadRes struct {
	UploadURL string `json:"uploadUrl"`
	ObjectKey string `json:"objectKey"`
}

type presignDownloadReq struct {
	ObjectKey string `json:"objectKey" binding:"required"`
}

type presignDownloadRes struct {
	DownloadURL string `json:"downloadUrl"`
}

func getSafeExtension(filename string) string {
	base := filepath.Base(filename)
	ext := strings.ToLower(filepath.Ext(base))

	allowedExtensions := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".gif":  true,
		".webp": true,
	}

	if allowedExtensions[ext] {
		return ext
	}
	return ""
}

func (h *ImageHandler) PresignUpload(c *gin.Context) {
	user, err := util.GetUser(c, h.db)
	if err != nil {
		c.JSON(
			http.StatusUnauthorized,
			gin.H{"error": "User not found or unauthorized"},
		)
		return
	}

	ctx := c.Request.Context()
	var req presignUploadReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request: " + err.Error()})
		return
	}

	isMember, err := util.UserInGroup(ctx, user.ID, req.GroupID, h.db)
	if err != nil || !isMember {
		c.JSON(
			http.StatusForbidden,
			gin.H{"message": "You are not authorized to upload to this group."},
		)
		return
	}

	ext := getSafeExtension(req.Filename)
	if req.Filename != "" && ext == "" {
		c.JSON(
			http.StatusBadRequest,
			gin.H{"message": "Filename must have a valid and supported extension (e.g., .jpg, .png)."},
		)
		return
	}

	// Format: groups/{groupID}/{uploaderUserID}/{fileUUID}.ext
	s3KeyPrefix := fmt.Sprintf(
		"groups/%s/%s/",
		req.GroupID.String(),
		user.ID.String(),
	)
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
		c.JSON(
			http.StatusInternalServerError,
			gin.H{"message": "Could not generate presigned URL: " + err.Error()},
		)
		return
	}

	c.JSON(http.StatusOK, presignUploadRes{
		UploadURL: uploadURL,
		ObjectKey: s3Key,
	})
}

func (h *ImageHandler) PresignDownload(c *gin.Context) {
	user, err := util.GetUser(c, h.db)
	if err != nil {
		c.JSON(
			http.StatusUnauthorized,
			gin.H{"error": "User not found or unauthorized"},
		)
		return
	}

	ctx := c.Request.Context()
	var req presignDownloadReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request: " + err.Error()})
		return
	}

	// Gets the groupID from the objectKey
	parts := strings.Split(req.ObjectKey, "/")
	if len(parts) < 4 || parts[0] != "groups" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid or malformed object key."})
		return
	}

	groupID, err := uuid.Parse(parts[1])
	if err != nil {
		c.JSON(
			http.StatusBadRequest,
			gin.H{"message": "Invalid group ID in object key."},
		)
		return
	}

	isMember, err := util.UserInGroup(ctx, user.ID, groupID, h.db)
	if err != nil || !isMember {
		c.JSON(
			http.StatusForbidden,
			gin.H{"message": "You are not authorized to access this resource."},
		)
		return
	}

	expiresDuration := 15 * time.Minute

	downloadURL, err := h.store.PresignDownload(ctx, req.ObjectKey, expiresDuration)
	if err != nil {
		c.JSON(
			http.StatusInternalServerError,
			gin.H{"message": "Could not generate presigned URL: " + err.Error()},
		)
		return
	}

	c.JSON(http.StatusOK, presignDownloadRes{
		DownloadURL: downloadURL,
	})
}
