package ws

import (
	"chat-app-server/db"
	"time"

	"github.com/google/uuid"
)

type Envelope struct {
	DeviceID  string `json:"deviceId"`
	EphPubKey string `json:"ephPubKey"` // Base64 encoded
	KeyNonce  string `json:"keyNonce"`  // Base64 encoded
	SealedKey string `json:"sealedKey"` // Base64 encoded
}

type RawMessageE2EE struct {
	ID          uuid.UUID      `json:"id"`
	GroupID     uuid.UUID      `json:"group_id"`
	MsgNonce    string         `json:"msgNonce"`   // Base64 encoded
	Ciphertext  string         `json:"ciphertext"` // Base64 encoded
	MessageType db.MessageType `json:"messageType"`
	Timestamp   string         `json:"timestamp"`
	SenderID    uuid.UUID      `json:"sender_id"`
	Envelopes   []Envelope     `json:"envelopes"`
}
type ClientSentE2EMessage struct {
	GroupID     uuid.UUID      `json:"group_id"`
	MsgNonce    string         `json:"msgNonce"`   // Base64 encoded
	Ciphertext  string         `json:"ciphertext"` // Base64 encoded
	MessageType db.MessageType `json:"messageType"`
	Envelopes   []Envelope     `json:"envelopes"`
}

type CreateGroupRequest struct {
	Name        string    `json:"name" binding:"required"`
	StartTime   time.Time `json:"start_time" binding:"required" `
	EndTime     time.Time `json:"end_time" binding:"required" `
	Description *string   `json:"description,omitempty"`
	Location    *string   `json:"location,omitempty"`
	ImageUrl    *string   `json:"image_url,omitempty"`
	Blurhash    *string   `json:"blurhash,omitempty"`
}

type UpdateGroupRequest struct {
	Name        *string    `json:"name,omitempty"`
	StartTime   *time.Time `json:"start_time,omitempty"`
	EndTime     *time.Time `json:"end_time,omitempty"`
	Description *string    `json:"description,omitempty"`
	Location    *string    `json:"location,omitempty"`
	ImageUrl    *string    `json:"image_url,omitempty"`
	Blurhash    *string    `json:"blurhash,omitempty"`
}

type ClientGroup struct {
	ID          uuid.UUID         `json:"id"`
	Name        string            `json:"name"`
	Description *string           `json:"description,omitempty"`
	Location    *string           `json:"location,omitempty"`
	ImageUrl    *string           `json:"image_url,omitempty"`
	Blurhash    *string           `json:"blurhash,omitempty"`
	StartTime   *time.Time        `json:"start_time,omitempty"`
	EndTime     *time.Time        `json:"end_time,omitempty"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
	Admin       bool              `json:"admin"`
	GroupUsers  []ClientGroupUser `json:"group_users"`
}

type UpdateGroupResponse struct {
	Group ClientGroup `json:"group"`
}

type JoinGroupRequest struct {
	ID uuid.UUID `json:"id"`
}

type InviteUsersToGroupRequest struct {
	GroupID uuid.UUID `json:"group_id"`
	Emails  []string  `json:"emails"`
}

type RemoveUserFromGroupRequest struct {
	GroupID uuid.UUID `json:"group_id"`
	Email   string    `json:"email"`
}

type GroupAdminMap map[uuid.UUID]bool

type ClientGroupUser struct {
	ID        uuid.UUID `json:"id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	Admin     bool      `json:"admin"`
	InvitedAt string    `json:"invited_at"`
}
