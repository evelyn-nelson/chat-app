package server

import (
	"chat-app-server/db"
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type API struct {
	db   *db.Queries
	ctx  context.Context
	conn *pgxpool.Pool
}

func NewAPI(db *db.Queries, ctx context.Context, conn *pgxpool.Pool) *API {
	return &API{
		db:   db,
		ctx:  ctx,
		conn: conn,
	}
}
