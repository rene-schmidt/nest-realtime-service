FROM node:20-bookworm-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Arbeitsverzeichnis
WORKDIR /app

# Dependencies
COPY package*.json ./
RUN npm install

# Source + Config
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY prisma ./prisma
COPY src ./src

# Build
RUN npm run build

# Production ENV
ENV NODE_ENV=production
EXPOSE 3000

# Start (bei dir: dist/src/main.js)
CMD ["node", "dist/src/main.js"]
