# 💬 NestJS Realtime Messaging API

A production-ready **NestJS** backend providing **realtime messaging** via **WebSockets (Socket.IO)** and a **REST API**, backed by **PostgreSQL** and **Prisma ORM**.

This project demonstrates a clean and scalable architecture for building **chat / messaging systems** with:
- JWT-based authentication
- Channel-based access control
- Realtime message delivery
- Persistent message storage
- Admin moderation capabilities

---

## 🟢 Live Demo

You can try the realtime messaging system in action here:

👉 **Live Demo:** https://rscoding.dev/projects/nestjs/demo

The demo showcases:
- Realtime messaging via WebSockets (Socket.IO)
- JWT-based authentication
- Channel access control (`general` / `support`)
- Message persistence and live updates

> Note: Some features (e.g. admin actions) may require an ADMIN account.

---

## 🚀 Features

### 🔐 Authentication
- JWT-based authentication
- Bearer tokens for both HTTP and WebSocket connections
- Role-based authorization (**USER**, **ADMIN**)

### 💬 Realtime Messaging (WebSocket)
- Socket.IO gateway for realtime communication
- Channel-based messaging (`general`, `support`)
- Access control enforced per channel
- Events:
  - `channel.join`
  - `message.send`
  - `message.new`
  - `auth.ok` / `auth.error`

### 🌐 REST API
- List messages by channel with pagination
- Admin-only moderation endpoints
- JWT authentication via Authorization header

### 🗄️ Database
- PostgreSQL
- Prisma ORM
- Indexed message queries
- Strongly typed schema (Role, ChannelKey)

### 🛡️ Access Control
- `support` channel restricted to ADMIN users
- Admin-only endpoints for message deletion and channel flushing

---

## 🧱 Tech Stack

- Node.js
- NestJS
- TypeScript
- Socket.IO
- Prisma ORM
- PostgreSQL
- Passport JWT
- class-validator

---

## 📁 Project Structure

```text
src/
├── messages/
│   ├── messages.controller.ts   # REST endpoints (list, delete, flush)
│   ├── messages.service.ts      # Business logic + DB access
│   └── dto/
│       └── list-messages.query.ts
├── realtime/
│   └── realtime.gateway.ts      # WebSocket gateway (Socket.IO)
├── auth/
│   └── jwt.strategy.ts          # JWT authentication strategy
├── prisma/
│   └── prisma.service.ts        # Prisma client service
├── app.module.ts
└── main.ts                      # Application entry point
prisma/
└── schema.prisma                # Message model + enums
```

---

## ⚙️ Prerequisites

Make sure you have installed:

- Node.js (v18+ recommended)
- npm
- PostgreSQL
- Git

---

## ⚙️ Environment Variables

Create a `.env` file in the project root:

```
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/DATABASE_NAME
JWT_ACCESS_SECRET=your-secret-key
PORT=3003
```

Notes:
- `JWT_ACCESS_SECRET` must match the token issuer
- If `PORT` is not set, the server defaults to **3003**

---

## 📦 Installation

Clone the repository:

```bash
git clone https://github.com/your-username/your-repo.git
cd your-repo
```

Install dependencies:

```bash
npm install
```

---

## 🗄️ Database Setup (Prisma)

Generate Prisma Client:

```bash
npx prisma generate
```

Run database migrations:

```bash
npx prisma migrate dev --name init
```

(Optional) Open Prisma Studio:

```bash
npx prisma studio
```

---

## ▶️ Running the Application

Development mode:

```bash
npm run start
```

Watch mode:

```bash
npm run start:dev
```

Production mode:

```bash
npm run start:prod
```

Server runs on:

```
http://localhost:3003
```

---

## 🧪 Testing with the Minimal CLI Socket Client

This repository includes a minimal interactive CLI client (`test-client.js`) to test:
- WebSocket authentication (JWT)
- Channel join + realtime messaging (Socket.IO)
- Message history (REST)
- Admin moderation endpoints (REST)

---

### 1) Install client dependencies

If you don't already have them installed in your project:

```bash
npm i socket.io-client node-fetch
```

---

### 2) Set environment variables

**Windows (cmd.exe):**
```bat
set TOKEN=<YOUR_JWT_ACCESS_TOKEN>
set API_KEY=<YOUR_GATEWAY_API_KEY>
set GW_URL=http://localhost:3000
```

**macOS / Linux (bash/zsh):**
```bash
export TOKEN=<YOUR_JWT_ACCESS_TOKEN>
export API_KEY=<YOUR_GATEWAY_API_KEY>
export GW_URL=http://localhost:3000
```

Notes:
- `GW_URL` defaults to `http://localhost:3000` if not set.
- The Socket.IO path is `/realtime/socket.io`.
- REST endpoints are called under `/realtime/...` (e.g. `/realtime/messages?...`).

---

### 3) Run the client

```bash
node test-client.js
```

---

### 4) Try commands

```text
join general
send general hello world
history general
```

If your JWT role is `ADMIN`, you can also run:

```text
flush general
del <messageId>
```

---

### Troubleshooting

- If you see `auth.error`, verify `JWT_ACCESS_SECRET` on the server matches the issuer of your token.
- If you get `connect_error`, confirm `GW_URL` and the Socket.IO path `/realtime/socket.io`.
- If `support` access fails as USER, that's expected: the `support` channel is ADMIN-only.

---

## 🔑 Messaging Flow

### WebSocket Connection
1. Client connects with JWT (`auth.token` or `Authorization` header)
2. Server validates token
3. User receives `auth.ok` or `auth.error`

### Join Channel
```text
channel.join { channel }
```

### Send Message
```text
message.send { channel, content }
```

### Broadcast
- Messages are persisted to PostgreSQL
- Broadcasted to all connected clients in the channel

---

## 📌 API Endpoints

Messages:
- `GET /messages?channel=general`
- `DELETE /messages/:id` (ADMIN only)
- `DELETE /messages/flush?channel=general` (ADMIN only)

---

## 🧠 Notes

- Realtime layer is intentionally decoupled from Prisma enums
- Channel access rules are enforced consistently in HTTP & WebSocket layers
- Designed as a solid foundation for chat, support systems, or realtime dashboards

---

## 📄 License

MIT License
