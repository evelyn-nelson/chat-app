package ws

type CreateGroupRequest struct {
	Name string `json:"name"`
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
