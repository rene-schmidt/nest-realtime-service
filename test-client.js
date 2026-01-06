/**
 * test-client.js (GATEWAY VERSION)
 *
 * Minimal interactive CLI client for testing the NestJS Realtime Gateway (Socket.IO)
 * plus the REST endpoints exposed behind the same gateway prefix.
 *
 * ENV:
 *   set TOKEN=<JWT_TOKEN>
 *   set API_KEY=devkey1
 *   set GW_URL=http://localhost:3000
 */

const { io } = require("socket.io-client");
const readline = require("readline");

// Dynamic import so this file works in CommonJS without ESM config changes
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

// Read required environment variables
const TOKEN = process.env.TOKEN;
const API_KEY = process.env.API_KEY;
const URL = process.env.GW_URL || "http://localhost:3000";

// Validate required env vars early and exit with instructions
if (!TOKEN) {
  console.error("TOKEN missing. Set it like so:");
  console.error("   set TOKEN=<JWT_TOKEN>");
  process.exit(1);
}
if (!API_KEY) {
  console.error("API_KEY missing. Set it like so:");
  console.error("   set API_KEY=<API_KEY from gateway>");
  process.exit(1);
}

// Setup readline interface for a tiny interactive shell
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ",
});

// Track role returned by the gateway (affects which commands are allowed)
let currentRole = "USER";
let helpPrintedForRole = false;

// Print command list (admin commands only shown if role is ADMIN)
function printHelp() {
  console.log("Commands:");
  console.log("  join <general|support>");
  console.log("  send <general|support> <text...>");
  console.log("  history <general|support>");
  console.log("  help");
  console.log("  exit");

  if (currentRole === "ADMIN") {
    console.log("\nAdmin commands:");
    console.log("  flush <general|support>");
    console.log("  del <messageId>");
  }
}

// Channel input guard
function isValidChannel(ch) {
  return ch === "general" || ch === "support";
}

// Guard for admin-only operations in the CLI
function requireAdmin() {
  if (currentRole !== "ADMIN") {
    console.log("Not allowed.");
    return false;
  }
  return true;
}

// Create Socket.IO connection to the gateway
const socket = io(URL, {
  // IMPORTANT: custom Socket.IO path used by the gateway
  path: "/realtime/socket.io",

  // Use websocket transport only (no polling)
  transports: ["websocket"],

  // Provide JWT token via Socket.IO handshake auth
  auth: { token: TOKEN },

  // Provide API key via extra headers (if your gateway requires it)
  extraHeaders: { "x-api-key": API_KEY },
});

// Connection lifecycle events
socket.on("connect", () => {
  console.log(`Connected ${socket.id}`);
  helpPrintedForRole = false;
  rl.prompt();
});

socket.on("disconnect", (reason, details) => {
  console.log("Disconnected:", reason, details || "");
  rl.prompt();
});

socket.on("connect_error", (err) => {
  console.log("connect_error:", err.message);
  rl.prompt();
});

// Realtime event: broadcast when a new message is created
socket.on("message.new", (msg) => {
  console.log("\n message.new:", msg);
  rl.prompt();
});

// Auth events from gateway
socket.on("auth.ok", (m) => {
  // Persist role from auth handshake
  currentRole = m?.role || "USER";
  console.log("auth.ok:", m);

  // Print help exactly once per connection after role is known
  if (!helpPrintedForRole) {
    printHelp();
    helpPrintedForRole = true;
  }

  rl.prompt();
});

socket.on("auth.error", (m) => {
  console.log("auth.error:", m);
  rl.prompt();
});

// Socket.IO: join a channel room
async function join(channel) {
  const res = await socket.emitWithAck("channel.join", { channel });
  console.log("join:", res);
}

// Socket.IO: send a message to a channel
async function send(channel, text) {
  const res = await socket.emitWithAck("message.send", {
    channel,
    content: text,
  });
  console.log("send:", res);
}

// IMPORTANT: via Gateway your HTTP endpoints are under /realtime/...
// HTTP: fetch message history for a channel
async function history(channel) {
  const res = await fetch(
    `${URL}/realtime/messages?channel=${encodeURIComponent(channel)}`,
    {
      headers: {
        "x-api-key": API_KEY,
        Authorization: `Bearer ${TOKEN}`,
      },
    }
  );
  const data = await res.json();
  console.log("history:", data);
}

// HTTP (admin): delete all messages of a channel
async function flushChannel(channel) {
  const res = await fetch(
    `${URL}/realtime/messages/flush?channel=${encodeURIComponent(channel)}`,
    {
      method: "DELETE",
      headers: {
        "x-api-key": API_KEY,
        Authorization: `Bearer ${TOKEN}`,
      },
    }
  );
  const data = await res.json();
  console.log("flush:", data);
}

// HTTP (admin): delete a single message by id
async function deleteMessage(id) {
  const res = await fetch(
    `${URL}/realtime/messages/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: {
        "x-api-key": API_KEY,
        Authorization: `Bearer ${TOKEN}`,
      },
    }
  );
  const data = await res.json();
  console.log("del:", data);
}

// CLI command loop
rl.on("line", async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return rl.prompt();

  // Parse command: <cmd> <arg1> <rest...>
  const [cmdRaw, arg1Raw, ...rest] = trimmed.split(" ");
  const cmd = (cmdRaw || "").toLowerCase();
  const arg1 = arg1Raw;
  const text = rest.join(" ");

  try {
    if (cmd === "help") {
      // Print help text
      printHelp();
    } else if (cmd === "join") {
      // Join a websocket channel
      if (!arg1 || !isValidChannel(arg1)) {
        console.log("Usage: join <general|support>");
      } else {
        await join(arg1);
      }
    } else if (cmd === "send") {
      // Send a message to a channel
      if (!arg1 || !isValidChannel(arg1) || !text) {
        console.log("Usage: send <general|support> <text...>");
      } else {
        await send(arg1, text);
      }
    } else if (cmd === "history") {
      // Fetch message history via REST
      if (!arg1 || !isValidChannel(arg1)) {
        console.log("Usage: history <general|support>");
      } else {
        await history(arg1);
      }
    } else if (cmd === "flush") {
      // Admin-only: flush channel via REST
      if (!requireAdmin()) return rl.prompt();
      if (!arg1 || !isValidChannel(arg1)) {
        console.log("Usage: flush <general|support>");
      } else {
        await flushChannel(arg1);
      }
    } else if (cmd === "del" || cmd === "delete") {
      // Admin-only: delete message via REST
      if (!requireAdmin()) return rl.prompt();
      if (!arg1) {
        console.log("Usage: del <messageId>");
      } else {
        await deleteMessage(arg1);
      }
    } else if (cmd === "exit" || cmd === "quit") {
      // Exit cleanly
      rl.close();
      socket.disconnect();
      process.exit(0);
    } else {
      // Unknown command handler
      console.log("Unknown command. Type: help");
    }
  } catch (e) {
    // Catch and show runtime errors without crashing the CLI
    console.error("Error:", e?.message || e);
  }

  rl.prompt();
});

// Ensure socket disconnects on readline close (Ctrl+C or exit)
rl.on("close", () => {
  socket.disconnect();
  process.exit(0);
});
