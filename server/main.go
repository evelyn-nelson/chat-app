package main

import (
	"chat-app-server/auth"
	"chat-app-server/db"
	"chat-app-server/router"
	"chat-app-server/server"
	"chat-app-server/ws"
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	ctx := context.Background()

	connPool, err := pgxpool.New(ctx, os.Getenv("DB_URL"))
	if err != nil {
		fmt.Fprintf(os.Stderr, "Unable to connect to database: %v\n", err)
		os.Exit(1)
	}
	db := db.New(connPool)

	authHandler := auth.NewAuthHandler(db, ctx, connPool)

	hub := ws.NewHub(db, ctx, connPool)
	wsHandler := ws.NewHandler(hub, db, ctx, connPool)
	go hub.Run(db, ctx)

	api := server.NewAPI(db, ctx, connPool)

	defer connPool.Close()

	router.InitRouter(authHandler, wsHandler, api)
	router.Start(":8080")
}
