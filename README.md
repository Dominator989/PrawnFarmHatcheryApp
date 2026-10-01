# Prawn Farm Hatchery App

This project is a small hatchery tracking app for keeping notes on when each tank had water changed, when it was fed, and what the next feed should be.

## Features

- Track each tank by name
- Record when the water was last changed
- Record when a tank was fed last
- Log the next feed due date
- Add notes for special observations
- Store records in a MySQL database
- Use the current local date and time automatically

## Quick start

1. Create a MySQL database and update the connection settings in the `.env` file.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the app:

   ```bash
   npm start
   ```

4. Open the app in your browser:

   ```text
   http://localhost:3000
   ```

## MySQL setup

Copy `.env.example` to `.env` and change the database values to match your MySQL server.

Example:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=prawn_farm_hatchery
```

The app will automatically create the database and table if the connection works.

## App flow

- The main form lets you add a tank event.
- The app saves records to MySQL.
- The recent activity list shows the latest tank updates.

## Project status

This is the initial working version of the app and is intended to be developed in a separate feature branch before merging later.
