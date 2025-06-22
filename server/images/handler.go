package images

import (
	"context"
	"errors"
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
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ImageHandler struct {
	store s3store.Store
	db    *db.Queries
	ctx   context.Context
	conn  *pgxpool.Pool
}

const MaxImageBytes = 5 * 1024 * 1024

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
	Filename  string    `json:"filename" binding:"required"`
	GroupID   uuid.UUID `json:"groupId" binding:"required"`
	Size      int64     `json:"size" binding:"required"`
	Expires   int       `json:"expires"`
	ForCreate bool      `json:"forCreate"`
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

	if req.ForCreate {
		if _, err := h.db.GetGroupById(ctx, req.GroupID); err == nil {
			c.JSON(http.StatusConflict,
				gin.H{"message": "group already exists, cannot pre-upload"})
			return
		} else if !errors.Is(err, pgx.ErrNoRows) {
			c.JSON(http.StatusInternalServerError,
				gin.H{"message": "internal error checking group"})
			return
		}

		resv, err := h.db.GetGroupReservation(ctx, req.GroupID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				c.JSON(http.StatusForbidden,
					gin.H{"message": "group not reserved for creation"})
			} else {
				c.JSON(http.StatusInternalServerError,
					gin.H{"message": "internal error checking reservation"})
			}
			return
		}
		if resv.UserID != user.ID {
			c.JSON(http.StatusForbidden,
				gin.H{"message": "you did not reserve this group"})
			return
		}

	} else {
		isMember, err := util.UserInGroup(ctx, user.ID, req.GroupID, h.db)
		if err != nil || !isMember {
			c.JSON(
				http.StatusForbidden,
				gin.H{"message": "You are not authorized to upload to this group."},
			)
			return
		}
	}

	if req.Size <= 0 || req.Size > MaxImageBytes {
		c.JSON(
			http.StatusBadRequest,
			gin.H{"message": "File has invalid size"},
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

	uploadURL, err := h.store.PresignUpload(ctx, s3Key, expiresDuration, req.Size)
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
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not found or unauthorized",
		})
		return
	}

	var req presignDownloadReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid request: " + err.Error(),
		})
		return
	}

	parts := strings.Split(req.ObjectKey, "/")
	// expect "groups/{groupID}/{userID}/{fileUUID}.ext"
	if len(parts) < 4 || parts[0] != "groups" {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid or malformed object key",
		})
		return
	}

	groupID, err := uuid.Parse(parts[1])
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid group ID in object key",
		})
		return
	}

	ctx := c.Request.Context()

	if _, err := h.db.GetGroupById(ctx, groupID); err == nil {
		isMember, err := util.UserInGroup(ctx, user.ID, groupID, h.db)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"message": "Error checking group membership",
			})
			return
		}
		if !isMember {
			c.JSON(http.StatusForbidden, gin.H{
				"message": "Not authorized to download from this group",
			})
			return
		}

	} else if errors.Is(err, pgx.ErrNoRows) {
		resv, err := h.db.GetGroupReservation(ctx, groupID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				c.JSON(http.StatusNotFound, gin.H{
					"message": "Group not found",
				})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{
					"message": "Error checking group reservation",
				})
			}
			return
		}
		if resv.UserID != user.ID {
			c.JSON(http.StatusForbidden, gin.H{
				"message": "Not authorized to download pre-created avatar",
			})
			return
		}

	} else {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Error loading group",
		})
		return
	}

	expires := 15 * time.Minute
	downloadURL, err := h.store.PresignDownload(
		ctx, req.ObjectKey, expires,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Could not generate presigned URL: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, presignDownloadRes{
		DownloadURL: downloadURL,
	})
}
