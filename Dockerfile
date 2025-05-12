FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Create a simple entrypoint script
RUN echo '#!/bin/sh\nnode -e "const cron = require('\''node-cron'\''); cron.schedule('\''0 9 * * *'\'', () => { console.log('\''Running calendar check...'\''); require('\''./src/calendar-bot.js'\''); });"' > /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Run the script daily at 9 AM (Sao Paulo time)
CMD ["/app/entrypoint.sh"]