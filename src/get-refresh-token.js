// get-refresh-token.js
require("dotenv").config();
const { google } = require("googleapis");
const http = require("http");
const url = require("url");
const open = require("open");
const destroyer = require("server-destroy");

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost:3000/oauth2callback"
);

const scopes = [
  "https://www.googleapis.com/auth/calendar", // Full access to Google Calendar
  "https://www.googleapis.com/auth/calendar.events", // Specific access for creating events
];

async function getRefreshToken() {
  const authorizeUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
  });

  console.log("Authorize this app by visiting this url:", authorizeUrl);

  // Open the browser
  await open(authorizeUrl, { wait: false });

  // Create a local server to receive the callback
  const server = http
    .createServer(async (req, res) => {
      try {
        if (req.url.indexOf("/oauth2callback") > -1) {
          const qs = new url.URL(req.url, "http://localhost:3000").searchParams;
          const code = qs.get("code");

          res.end("Authentication successful! You can close this window.");
          server.destroy();

          // Get the access and refresh tokens
          const { tokens } = await oauth2Client.getToken(code);
          console.log("Refresh token:", tokens.refresh_token);
          console.log("Access token:", tokens.access_token);
        }
      } catch (e) {
        console.error(e);
      }
    })
    .listen(3000, () => {
      console.log("Listening on port 3000");
    });

  destroyer(server);
}

getRefreshToken();
