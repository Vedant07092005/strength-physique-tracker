# FORGE — Strength & Physique Progression Tracker

FORGE is a private training log for strength sessions and physique check-ins. It uses React and Vite for the client, Express for the API, and MySQL for storage.

## Stack

- JavaScript, React, Vite, Express, and `mysql2`
- MySQL 8.0+
- HttpOnly JWT session cookie; account IDs come from the verified token
- Native `fetch`, plain CSS, parameterized SQL, and Node's built-in test runner

## Local setup

1. Create a MySQL user and database, then apply the schema and exercise catalog:

   ```sh
   mysql -u root -p < schema/schema.sql
   mysql -u root -p forge < schema/seed.sql
   ```

2. Copy `.env.example` to `.env` and set the database credentials plus a random `JWT_SECRET` of at least 32 characters.

3. Install the approved packages with `npm ci`.

4. In one terminal run `npm run server`; in another run `npm run dev`. Open the Vite URL shown in the terminal.

## Production

Build the client with `npm run build`, then start the API and static client with `npm start`. The same Express process serves `dist` and `/api`.

For a container deployment, copy `.env.example` to `.env`, set strong values for `DB_PASSWORD`, `MYSQL_ROOT_PASSWORD`, and `JWT_SECRET`, and run:

```sh
docker compose up --build
```

The compose setup starts MySQL 8.4 and initializes the schema and seed catalog on the first database start. Keep `.env` private. Use HTTPS in production so the session cookie is marked Secure.

## Tests

```sh
npm test
npm run build
```

The current automated tests cover request validation. The deployment health check is available at `/api/health` and checks the database connection.

## Data model

Users own their workouts, check-ins, and custom exercises. A small shared exercise catalog is seeded with `owner_id = NULL`. Workout entries point to exercise IDs; they do not copy exercise names. Renaming a custom exercise therefore updates its displayed name in every workout, and archived exercises stay attached to historical sessions. Each complete workout is written inside one MySQL transaction.
