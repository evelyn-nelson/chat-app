package router

import (
	"chat-app-server/server"
	"chat-app-server/ws"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

var r *gin.Engine

func InitRouter(wsHandler *ws.Handler, api *server.API) {
	r = gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:8081", "http://192.168.1.12:8081", "http://192.168.1.32:8081"},
		AllowMethods:     []string{"GET", "POST"},
		AllowHeaders:     []string{"Content-Type"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		AllowOriginFunc: func(origin string) bool {
			return origin == "http://localhost:8081"
		},
		MaxAge: 12 * time.Hour,
	}))
	r.GET("/api/users", api.GetUsers)
	r.GET("/api/users/:userID", api.GetUser)
	r.POST("/api/users", api.CreateUser)
	r.PUT("/api/users/:userID", api.UpdateUser)

	r.POST("/ws/createGroup", wsHandler.CreateGroup)
	r.GET("/ws/joinGroup/:groupID", wsHandler.JoinGroup)
	r.POST("/ws/createAndJoinGroup", wsHandler.CreateAndJoinGroup)
	r.GET("/ws/getGroups", wsHandler.GetGroups)
	r.GET("/ws/getUsersInGroup/:groupID", wsHandler.GetUsersInGroup)
}

func Start(addr string) error {
	return r.Run(addr)
}
