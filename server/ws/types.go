package ws

import "time"

type CreateGroupRequest struct {
	Name      string    `json:"name" binding:"required"`
	StartTime time.Time `json:"start_time" binding:"required" time_format:"2006-01-02T15:04:05.000Z" time_utc:"true"`
	EndTime   time.Time `json:"end_time" binding:"required" time_format:"2006-01-02T15:04:05.000Z" time_utc:"true"`
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
