package ws

type CreateGroupRequest struct {
	Name string `json:"name"`
	// UserID string `json:"userID"`
	Username string `json:"username"`
}

type CreateGroupResponse struct {
	Name string `json:"name"`
	ID   string `json:"id"`
}
