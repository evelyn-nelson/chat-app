.PHONY: dev-up dev-down dev-restart logs-go migrate-up sqlc-gen expo-start expo-lint expo-test expo-ios-dev expo-ios-release

# Docker-first server targets

dev-up:
	docker compose up

dev-down:
	docker compose down

dev-restart:
	docker compose down && docker compose up

logs-go:
	docker-compose logs -f go-server

migrate-up:
	docker compose run --rm migrate -path /migrations -database "postgres://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME:-postgres}?sslmode=disable" up

sqlc-gen:
	docker compose run --rm sqlc generate -f server/sqlc.yaml

# Expo (client) targets

expo-start:
	cd expo && npx expo start

expo-lint:
	cd expo && npm run lint

expo-test:
	cd expo && npm run test

# Local iOS dev build using Expo CLI (not EAS). Requires Xcode and provisioning for device builds.
# This compiles a development build and launches it on a simulator by default.
expo-ios-dev:
	cd expo && npx expo run:ios

# Optional: build with Release configuration locally (still via Expo CLI, not EAS)
expo-ios-release:
	cd expo && npx expo run:ios --configuration Release
