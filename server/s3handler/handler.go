package s3handler

import (
	"chat-app-server/db"
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type S3Handler struct {
	db   *db.Queries
	ctx  context.Context
	conn *pgxpool.Pool
}

func NewS3Handler(db *db.Queries, ctx context.Context, conn *pgxpool.Pool) *S3Handler {
	return &S3Handler{
		db:   db,
		ctx:  ctx,
		conn: conn,
	}
}
