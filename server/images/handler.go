package images

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"chat-app-server/s3store"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ImageHandler struct {
	store s3store.Store
}

func NewImageHandler(store s3store.Store) *ImageHandler {
	return &ImageHandler{store: store}
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
	ctx := c.Request.Context()
	var req presignUploadReq // Using the new request struct
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request: " + err.Error()})
		return
	}

	// --- 1. Authentication: Get User ID ---
	// IMPORTANT: You MUST have authentication middleware that verifies the user
	// and makes the user's ID available in the Gin context.
	// Replace "userID" with the actual key you use in c.Get("userID").
	userIDValue, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "User not authenticated"})
		return
	}
	// Assuming userID is stored as uuid.UUID. Adjust if it's a string.
	userID, ok := userIDValue.(uuid.UUID)
	if !ok {
		// If userID is a string (e.g., from JWT `sub`):
		// userIDStr, okStr := userIDValue.(string)
		// if !okStr {
		// 	c.JSON(http.StatusInternalServerError, gin.H{"message": "Invalid user ID format in context"})
		// 	return
		// }
		// var errParse error
		// userID, errParse = uuid.Parse(userIDStr)
		// if errParse != nil {
		// 	c.JSON(http.StatusInternalServerError, gin.H{"message": "Could not parse user ID"})
		// 	return
		// }
		c.JSON(http.StatusInternalServerError, gin.H{"message": "User ID in context is not of expected type"})
		return
	}

	// --- 2. Validate Inputs & Determine Extension ---
	ext := getSafeExtension(req.Filename)

	// Optional: Require a valid extension
	if req.Filename != "" && ext == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Filename must have a valid and supported extension (e.g., .jpg, .png)."})
		return
	}
	// If you allow uploads without extensions, `ext` will be ""

	// --- 3. Authorization & Key Scoping (Contextual) ---
	// This is where you'd check if the user can upload for a specific context.
	// For example, if `req.ContextType == "group_avatar"` and `req.ContextID` is a group's UUID:
	// groupID, err := uuid.Parse(req.ContextID)
	// if err != nil { /* handle error */ }
	// canUpload := h.checkUserPermissionForGroup(ctx, userID, groupID) // Your logic
	// if !canUpload {
	//    c.JSON(http.StatusForbidden, gin.H{"message": "Not authorized"})
	//    return
	// }
	// s3KeyPrefix = fmt.Sprintf("groups/%s/avatars/", groupID.String())

	// For now, let's use a generic user-scoped path:
	s3KeyPrefix := fmt.Sprintf("users/%s/uploads/", userID.String())

	// --- 4. Generate S3 Object Key ---
	s3ObjectUUID := uuid.New().String()
	s3Key := s3KeyPrefix + s3ObjectUUID + ext // e.g., "users/user-uuid/uploads/file-uuid.jpg"

	// --- 5. Determine Expiration ---
	expiresDuration := time.Duration(req.Expires) * time.Second
	if req.Expires <= 0 {
		expiresDuration = 15 * time.Minute // Default to 15 minutes
	}
	// Enforce a maximum expiration to prevent overly long-lived presigned URLs
	maxExpiration := 1 * time.Hour
	if expiresDuration > maxExpiration {
		expiresDuration = maxExpiration
	}

	// --- 6. Generate Presigned URL ---
	uploadURL, err := h.store.PresignUpload(ctx, s3Key, expiresDuration)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Could not generate presigned URL: " + err.Error()})
		return
	}

	// --- 7. Respond ---
	c.JSON(http.StatusOK, presignUploadRes{
		UploadURL: uploadURL,
		ObjectKey: s3Key, // Send the generated key back to the client
	})
}
