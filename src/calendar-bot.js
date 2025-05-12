const { google } = require("googleapis");
const axios = require("axios");
const {
  format,
  startOfDay,
  addDays,
  parseISO,
  getYear,
  setYear,
  addMinutes,
} = require("date-fns");
const { zonedTimeToUtc, utcToZonedTime } = require("date-fns-tz");
const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();

// Timezone configuration
const TIMEZONE = "America/Sao_Paulo";

// Telegram configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Initialize Telegram bot with polling
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Google Calendar auth setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const calendar = google.calendar({ version: "v3", auth: oauth2Client });

// Command handler for /set
bot.onText(/\/set (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const fullCommand = match[1];

  try {
    // Extract command parts using regex
    const commandRegex = /^(.+) (\d{2}\/\d{2}) (\d{2}[h:]\d{2}) (\d+[hm]?)$/;
    const commandMatch = fullCommand.match(commandRegex);

    if (!commandMatch) {
      bot.sendMessage(
        chatId,
        "❌ Formato inválido. Use: /set <nome do evento> <data DD/MM> <hora HH:mm ou HHhMM> <duração>"
      );
      return;
    }

    const [, eventName, dateStr, timeStr, durationStr] = commandMatch;

    // Parse date (DD/MM)
    const dateMatch = dateStr.match(/^(\d{2})\/(\d{2})$/);
    if (!dateMatch) {
      bot.sendMessage(
        chatId,
        "❌ Formato de data inválido. Use DD/MM (ex: 29/05)"
      );
      return;
    }

    const day = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10) - 1; // 0-indexed month

    // Parse time (14h30 or 14:30)
    let hours, minutes;
    if (timeStr.includes("h")) {
      const timeParts = timeStr.split("h");
      hours = parseInt(timeParts[0], 10);
      minutes = parseInt(timeParts[1], 10);
    } else {
      const timeParts = timeStr.split(":");
      hours = parseInt(timeParts[0], 10);
      minutes = parseInt(timeParts[1], 10);
    }

    // Parse duration
    let durationMinutes;
    if (durationStr.endsWith("h")) {
      durationMinutes = parseInt(durationStr.slice(0, -1), 10) * 60;
    } else if (durationStr.endsWith("m")) {
      durationMinutes = parseInt(durationStr.slice(0, -1), 10);
    } else {
      durationMinutes = parseInt(durationStr, 10);
    }

    // Create date objects
    const currentYear = getYear(new Date());
    let eventDate = new Date(currentYear, month, day, hours, minutes);

    // Convert current time to the configured timezone
    const nowInTimezone = utcToZonedTime(new Date(), TIMEZONE);

    // If date is in the past, set to next year
    if (eventDate < nowInTimezone) {
      eventDate = setYear(eventDate, currentYear + 1);
    }

    // Convert to UTC for API
    const startDateTime = zonedTimeToUtc(eventDate, TIMEZONE);
    const endDateTime = addMinutes(startDateTime, durationMinutes);

    // Create calendar event
    const event = {
      summary: eventName,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: TIMEZONE,
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: TIMEZONE,
      },
    };

    // Insert event to Google Calendar
    const response = await calendar.events.insert({
      calendarId: "primary",
      resource: event,
    });

    // Send confirmation
    const eventLink = response.data.htmlLink;
    const confirmationMsg = `✅ Evento criado com sucesso!\n\n📅 *${eventName}*\n📆 ${format(
      eventDate,
      "dd/MM/yyyy"
    )}\n⏰ ${format(
      eventDate,
      "HH:mm"
    )}\n⏱️ ${durationMinutes} minutos\n\n🔗 [Ver no Google Calendar](${eventLink})`;

    await bot.sendMessage(chatId, confirmationMsg, { parse_mode: "Markdown" });

    // Show all events for the day after scheduling
    if (
      format(eventDate, "dd/MM/yyyy") === format(nowInTimezone, "dd/MM/yyyy")
    ) {
      await bot.sendMessage(chatId, "Buscando eventos para hoje...");
      await showDailyEvents(chatId);
    }
  } catch (error) {
    console.error("Error creating event:", error);
    bot.sendMessage(chatId, `❌ Erro ao criar evento: ${error.message}`);
  }
});

// Function to show events for the current day
async function showDailyEvents(chatId) {
  try {
    // Get today's start and end in the correct timezone
    const nowInSaoPaulo = utcToZonedTime(new Date(), TIMEZONE);
    const todayStart = startOfDay(nowInSaoPaulo);
    const tomorrowStart = addDays(todayStart, 1);

    // Convert to UTC for API call
    const todayStartUTC = zonedTimeToUtc(todayStart, TIMEZONE);
    const tomorrowStartUTC = zonedTimeToUtc(tomorrowStart, TIMEZONE);

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: todayStartUTC.toISOString(),
      timeMax: tomorrowStartUTC.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = response.data.items;

    // Create message
    let message = "";
    const formattedDate = format(nowInSaoPaulo, "dd/MM/yyyy");

    if (events.length === 0) {
      message = `📅 *${formattedDate}*: Não há eventos agendados para hoje!`;
    } else {
      message = `📅 *Agenda para ${formattedDate}:*\n\n`;

      events.forEach((event) => {
        // Handle event time (convert to Sao Paulo timezone)
        let startTime;
        let timeDisplay;

        if (event.start.dateTime) {
          // Convert event time to Sao Paulo timezone
          startTime = utcToZonedTime(parseISO(event.start.dateTime), TIMEZONE);
          timeDisplay = format(startTime, "HH:mm");
        } else {
          // All-day event
          timeDisplay = "Dia inteiro";
        }

        message += `• ${timeDisplay}: *${event.summary}*`;

        if (event.location) {
          message += ` 📍 ${event.location}`;
        }

        message += "\n";
      });
    }

    await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    bot.sendMessage(chatId, `❌ Erro ao buscar eventos: ${error.message}`);
  }
}

async function checkCalendar() {
  try {
    // Get today's start and end in the correct timezone
    const nowInSaoPaulo = utcToZonedTime(new Date(), TIMEZONE);
    const todayStart = startOfDay(nowInSaoPaulo);
    const tomorrowStart = addDays(todayStart, 1);

    // Convert to UTC for API call
    const todayStartUTC = zonedTimeToUtc(todayStart, TIMEZONE);
    const tomorrowStartUTC = zonedTimeToUtc(tomorrowStart, TIMEZONE);

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: todayStartUTC.toISOString(),
      timeMax: tomorrowStartUTC.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = response.data.items;

    // Create message
    let message = "";
    const formattedDate = format(nowInSaoPaulo, "dd/MM/yyyy");

    if (events.length === 0) {
      message = `📅 *${formattedDate}*: Não há eventos agendados para hoje!`;
    } else {
      message = `📅 *Agenda para ${formattedDate}:*\n\n`;

      events.forEach((event) => {
        // Handle event time (convert to Sao Paulo timezone)
        let startTime;
        let timeDisplay;

        if (event.start.dateTime) {
          // Convert event time to Sao Paulo timezone
          startTime = utcToZonedTime(parseISO(event.start.dateTime), TIMEZONE);
          timeDisplay = format(startTime, "HH:mm");
        } else {
          // All-day event
          timeDisplay = "Dia inteiro";
        }

        message += `• ${timeDisplay}: *${event.summary}*`;

        if (event.location) {
          message += ` 📍 ${event.location}`;
        }

        message += "\n";
      });
    }

    // Send to Telegram
    await sendTelegramMessage(message);
    console.log("Calendar check completed and notification sent");
  } catch (error) {
    console.error("Error checking calendar:", error);
  }
}

async function sendTelegramMessage(message) {
  try {
    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "Markdown",
      }
    );
  } catch (error) {
    console.error("Error sending Telegram message:", error);
  }
}

// Run the script
checkCalendar();

console.log("Bot started. Listening for commands...");
