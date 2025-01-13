Temporary group chats for events.

## Running the Expo app

### 0. Install dependencies via your package manager of choice
   - `golang-migrate`
   - `sqlc`
   - [Install Go](https://go.dev/dl/)
### 1. Install project dependencies

   ```bash
   cd expo
   npm install
   ```

### 2. Start the app

   ```bash
    npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).


### 3. Run the Docker containers
From the root directory, **not** `expo/`, run

```bash
docker compose up
```
to run the Go server and postgres/migrate/sqlc.

To create a new migration, run `migrate create -ext sql -dir db/migrations -seq {name_of_migration}`

To access the db directly, run
```bash
docker exec -it chat-app-db-1 bash
psql -U postgres \c postgres
```
