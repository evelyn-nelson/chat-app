Temporary group chats for events.

## Running the Expo app

### 0. Setup
#### Install dependencies via your package manager of choice
   - `golang-migrate`
   - `sqlc`
   - [Install Go](https://go.dev/dl/)
#### Setup `.env` files
   1. Generate a JWT_SECRET [here](https://jwtsecret.com/generate)
   2. In root directory, setup a `.env` with these contents:
   ```
   DB_USER=postgres
   DB_PASSWORD=postgres
   DB_URL=postgres://postgres:postgres@db:5432/postgres
   JWT_SECRET={generated secret}
   ```
   3. Check your wifi settings and get your local IP address. It should be in the form `192.168.1.X`
   4. In `expo/`, setup a .env with these contents:
   ```
   NODE_ENV=development
   EXPO_PUBLIC_HOST=192.168.1.X:8080
   ```
   5. In `server/router.go`, add your IP address with port `8081` to the list of known addresses.
       - TODO: Make this automated.
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
