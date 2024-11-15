package main

import (
	"chat-app-server/db"
	"chat-app-server/router"
	"chat-app-server/server"
	"chat-app-server/ws"
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5"
)

func main() {
	ctx := context.Background()

	conn, err := pgx.Connect(ctx, os.Getenv("DB_URL"))
	if err != nil {
		fmt.Fprintf(os.Stderr, "Unable to connect to database: %v\n", err)
		os.Exit(1)
	}
	db := db.New(conn)

	hub := ws.NewHub()
	wsHandler := ws.NewHandler(hub, db, ctx, conn)
	go hub.Run()

	api := server.NewAPI(db, ctx, conn)

	defer conn.Close(ctx)

	router.InitRouter(wsHandler, api)
	router.Start(":8080")
}
