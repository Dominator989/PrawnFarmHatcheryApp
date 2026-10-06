# Prawn Farm Hatchery App

This project is a small hatchery tracking app for keeping notes on when each tank had water changed, when it was fed, and what the next feed should be.

## Features

- Track each tank by name
- Record the hatchery stage or PL size band, from nauplii through juvenile
- Record a primary food and an optional second food for each tank
- Track adult prawn tanks on a separate page without a PL stage field
- Record when the water was last changed
- Record when a tank was fed last
- Log the next feed due date
- Add notes for special observations
- Store records in a MySQL database
- Use the current local date and time automatically

For black tiger prawns, the hatchery page now calculates approximate lifecycle bands from the date stocked: nauplii, zoea, mysis, early PL, later PL, and juvenile/grow-out. PL means post-larvae. These are operational estimates because exact timing and size vary with species, temperature, nutrition, and hatchery practice.

The adult tank page is available at `/adult.html`. Its food fields use clear dropdowns with an `Other - see notes` option for anything outside the standard list.

## Quick start

### Option 1: One-click launch on Windows

Double-click `start-app.bat` in the project folder, or run this in PowerShell:

```powershell
./start-app.ps1
```

This script will check whether dependencies are installed, install them if needed, and then start the app.

### Option 2: Manual launch

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the app:

   ```bash
   npm start
   ```

3. Open the app in your browser:

   ```text
   http://localhost:3000
   ```

## Database mode

This project is now SQLite-first so it works immediately without a MySQL server.

The app stores data in a local SQLite database at:

```text
./data/prawn_farm_hatchery.sqlite
```

The default config is already set in `.env` to use SQLite. If you later want to switch to MySQL for production, set:

```env
DB_CLIENT=mysql
```

and fill in the MySQL connection values.

## App flow

- The main form lets you add a tank event.
- The app saves records to SQLite by default.
- The recent activity list shows the latest tank updates.
- The records can be exported later to CSV or migrated to MySQL when your farm scales up.

## Project status

This branch is the local, easy-to-run starter version of the app and keeps the project in a clean feature branch so it can be merged later.
