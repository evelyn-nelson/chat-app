package router

import (
	"chat-app-server/auth"
	"chat-app-server/server"
	"chat-app-server/ws"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

var r *gin.Engine

func InitRouter(authHandler *auth.AuthHandler, wsHandler *ws.Handler, api *server.API) {
	r = gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:8081", "http://192.168.1.12:8081", "http://192.168.1.32:8081", "http://192.168.1.42:8081", "http://192.168.1.8:8081", "http://192.168.1.18:8081", "http://192.168.1.80:8081", "http://192.168.1.2:8081"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE"},
		AllowHeaders:     []string{"Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		AllowOriginFunc: func(origin string) bool {
			return origin == "http://localhost:8081"
		},
		MaxAge: 12 * time.Hour,
	}))

	// auth routes group
	authRoutes := r.Group("/auth/")
	authRoutes.POST("/signup", authHandler.Signup)
	authRoutes.POST("/login", authHandler.Login)

	// CRUD routes group
	apiRoutes := r.Group("/api/")
	apiRoutes.Use(auth.JWTAuthMiddleware())

	// User CRUD routes
	apiRoutes.GET("/users/whoami", api.WhoAmI)
	apiRoutes.GET("/users", api.GetUsers)
	apiRoutes.GET("/users/:userID", api.GetUser)
	apiRoutes.PUT("/users/:userID", api.UpdateUser)
	apiRoutes.DELETE("/users/:userID", api.DeleteUser)

	// UserGroup CRUD routes
	apiRoutes.GET("/user_groups", api.GetUserGroups)
	apiRoutes.GET("/user_groups/:userID/:groupID", api.GetUserGroup)
	apiRoutes.POST("/user_groups", api.CreateUserGroup)
	apiRoutes.PUT("/user_groups/:userID/:groupID", api.UpdateUserGroup)
	apiRoutes.DELETE("/user_groups/:userID/:groupID", api.DeleteUserGroup)

	// Group CRUD routes
	apiRoutes.GET("/groups", api.GetGroups)
	apiRoutes.GET("/groups/:groupID", api.GetGroup)
	apiRoutes.POST("/groups", api.CreateGroup)
	apiRoutes.PUT("/groups/:groupID", api.UpdateGroup)
	apiRoutes.DELETE("/groups/:groupID", api.DeleteGroup)

	// WS routes
	wsRoutes := r.Group("/ws/")
	wsRoutes.Use(auth.JWTAuthMiddleware())

	wsRoutes.POST("/createGroup", wsHandler.CreateGroup)
	wsRoutes.PUT("/updateGroup/:groupID", wsHandler.UpdateGroup)
	wsRoutes.POST("/inviteUsersToGroup", wsHandler.InviteUsersToGroup)
	wsRoutes.POST("/removeUserFromGroup", wsHandler.RemoveUserFromGroup)
	wsRoutes.GET("/getGroups", wsHandler.GetGroups)
	wsRoutes.GET("/getUsersInGroup/:groupID", wsHandler.GetUsersInGroup)
	wsRoutes.POST("/leaveGroup/:groupID", wsHandler.LeaveGroup)
	wsRoutes.GET("/relevantUsers", wsHandler.GetRelevantUsers)
	wsRoutes.GET("/relevantMessages", wsHandler.GetRelevantMessages)

	r.GET("/ws/establishConnection", wsHandler.EstablishConnection)
}

func Start(addr string) error {
	return r.Run(addr)
}
