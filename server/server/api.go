package server

import (
	"chat-app-server/db"
	"context"

	"github.com/jackc/pgx/v5"
)

type API struct {
	db   *db.Queries
	ctx  context.Context
	conn *pgx.Conn
}

func NewAPI(db *db.Queries, ctx context.Context, conn *pgx.Conn) *API {
	return &API{
		db:   db,
		ctx:  ctx,
		conn: conn,
	}
}
