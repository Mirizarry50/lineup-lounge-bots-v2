FROM node:24-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY migrations ./migrations
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
CMD ["node", "src/bot.js"]
