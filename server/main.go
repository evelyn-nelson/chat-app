package main

import (
	"chat-app-server/auth"
	"chat-app-server/db"
	"chat-app-server/images"
	"chat-app-server/router"
	"chat-app-server/s3store"
	"chat-app-server/server"
	"chat-app-server/ws"
	"context"
	"fmt"
	"log"
	"os"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

var (
	RedisClient      *redis.Client
	ServerInstanceID string
)

func InitializeRedis(ctx context.Context) {
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		log.Fatal("REDIS_URL environment variable not set")
	}
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Fatalf("Could not parse REDIS_URL: %v", err)
	}
	RedisClient = redis.NewClient(opts)
	if err := RedisClient.Ping(ctx).Err(); err != nil {
		log.Fatalf("Could not connect to Redis: %v", err)
	}
	log.Println("Successfully connected to Redis.")
}

func init() {
	ServerInstanceID = uuid.NewString()
	log.Printf("Initializing with ServerInstanceID: %s", ServerInstanceID)
}

func main() {
	ctx := context.Background()

	InitializeRedis(ctx)

	connPool, err := pgxpool.New(ctx, os.Getenv("DB_URL"))
	if err != nil {
		fmt.Fprintf(os.Stderr, "Unable to connect to database: %v\n", err)
		os.Exit(1)
	}
	db := db.New(connPool)

	authHandler := auth.NewAuthHandler(db, ctx, connPool)
	hub := ws.NewHub(db, ctx, connPool, RedisClient, ServerInstanceID)
	wsHandler := ws.NewHandler(hub, db, ctx, connPool)
	go hub.Run()

	api := server.NewAPI(db, ctx, connPool)

	cfg, _ := config.LoadDefaultConfig(context.Background())
	store := s3store.New(cfg, os.Getenv("S3_BUCKET"))

	imageHandler := images.NewImageHandler(store)

	defer connPool.Close()

	router.InitRouter(authHandler, wsHandler, api, imageHandler)
	router.Start(":8080")

}
