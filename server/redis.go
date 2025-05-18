package main

import (
	"context"
	"log"
	"os"

	"github.com/google/uuid"
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
