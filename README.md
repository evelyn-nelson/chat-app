Temporary group chats for events.

## Expo app

1. Install dependencies

   ```bash
   cd expo
   npm install
   ```

2. Start the app

   ```bash
    npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).


3. From the root directory, run `docker compose up` to run the go server and postgres/migrate/sqlc

this is set up to work with docker but you should probably install golang migrate, sqlc, and go yourself.

`brew install golang-migrate`

To create a new migration, run migrate create -ext sql -dir db/migrations -seq {name_of_migration}

To access the db directly, run
`docker exec -it chat-app-db-1 bash`
`psql -U postgres`
`\c postgres`