FROM node:22-slim AS builder

WORKDIR /app

# Install build tools for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

# Final stage
FROM node:22-slim

WORKDIR /app

COPY --from=builder /app /app

EXPOSE 3000

CMD ["node", "server.js"]
