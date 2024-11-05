package main

import (
	"chat-app-server/db"
	"chat-app-server/router"
	"chat-app-server/ws"
)

func main() {
	db.InitDB()
	hub := ws.NewHub()
	wsHandler := ws.NewHandler(hub)
	go hub.Run()

	router.InitRouter(wsHandler)
	router.Start(":8080")
}
