# GCalendar Agent

A Telegram bot that integrates with Google Calendar, allowing you to create and manage events directly from Telegram.

## Features

- Create calendar events via Telegram using simple commands
- View your daily agenda
- Receive notifications about upcoming events
- Properly handles timezone (America/Sao_Paulo)

## Requirements

- Node.js 18+
- Google Cloud Platform account
- Telegram Bot Token

## Setup

### 1. Google API Setup

1. Create a project in the [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Google Calendar API
3. Create OAuth 2.0 credentials (Web application type)
4. Set the redirect URI to `http://localhost:3000/oauth2callback`
5. Note your Client ID and Client Secret

### 2. Telegram Bot Setup

1. Talk to [@BotFather](https://t.me/botfather) on Telegram
2. Use the `/newbot` command to create a new bot
3. Follow the instructions and get your bot token
4. Start a conversation with your bot and get your chat ID

### 3. Project Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the project root with the following content:
   ```
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   TELEGRAM_CHAT_ID=your_telegram_chat_id
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
   GOOGLE_REFRESH_TOKEN=your_google_refresh_token
   ```
4. Generate a refresh token by running:
   ```
   npm run token
   ```
   This will open a browser where you need to authorize the application, then copy the refresh token to your `.env` file.

## Running the Bot

### Using Node.js

```
npm start
```

### Using Docker

```
docker-compose up -d
```

## Usage

### Creating Events

Use the `/set` command with the following format:

```
/set <event name> <date> <time> <duration>
```

Examples:
- `/set Team Meeting 29/05 14:30 1h`
- `/set Doctor Appointment 15/06 09h30 45m`

#### Parameters:
- **Event name**: The title of your event
- **Date**: Format `DD/MM` (day/month)
- **Time**: Format `HH:mm` or `HHhMM`
- **Duration**: Format `Xh` for hours or `Xm` for minutes (or just `X` for minutes)

### Viewing Daily Events

The bot will automatically show the day's events after you create a new event for the current day.

## License

See the [LICENSE](LICENSE) file for details.