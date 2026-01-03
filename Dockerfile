FROM node:20-bookworm-slim

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
