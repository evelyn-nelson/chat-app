package ws

import (
	"time"
)

type CreateGroupRequest struct {
	Name      string    `json:"name" binding:"required"`
	StartTime time.Time `json:"start_time" binding:"required" time_format:"2006-01-02T15:04:05.000Z" time_utc:"true"`
	EndTime   time.Time `json:"end_time" binding:"required" time_format:"2006-01-02T15:04:05.000Z" time_utc:"true"`
}

type UpdateGroupRequest struct {
	Name      *string    `json:"name,omitempty"`
	StartTime *time.Time `json:"start_time,omitempty"`
	EndTime   *time.Time `json:"end_time,omitempty"`
}

type ClientGroup struct {
	ID         int32             `json:"id"`
	Name       string            `json:"name"`
	StartTime  *time.Time        `json:"start_time,omitempty"`
	EndTime    *time.Time        `json:"end_time,omitempty"`
	CreatedAt  time.Time         `json:"created_at"`
	UpdatedAt  time.Time         `json:"updated_at"`
	Admin      bool              `json:"admin"`
	GroupUsers []ClientGroupUser `json:"group_users"`
}

type UpdateGroupResponse struct {
	Group ClientGroup `json:"group"`
}

type JoinGroupRequest struct {
	ID int32 `json:"id"`
}

type InviteUsersToGroupRequest struct {
	GroupID int32    `json:"group_id"`
	Emails  []string `json:"emails"`
}

type RemoveUserFromGroupRequest struct {
	GroupID int32  `json:"group_id"`
	Email   string `json:"email"`
}

type GroupAdminMap map[int32]bool

type ClientGroupUser struct {
	ID        int32  `json:"id"`
	Username  string `json:"username"`
	Email     string `json:"email"`
	Admin     bool   `json:"admin"`
	InvitedAt string `json:"invited_at"`
}
