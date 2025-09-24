# Simple image for the API service
FROM node:20-alpine

WORKDIR /app

# Install only server dependencies (use full install for simplicity)
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy server code
COPY server ./server

# Copy env at runtime via docker-compose env section
EXPOSE 5174

CMD ["node", "server/index.js"]
