/**
 * test-client.js (GATEWAY VERSION)
 *
 * ENV:
 *   set TOKEN=<JWT_TOKEN>
 *   set API_KEY=devkey1
 *   set GW_URL=http://localhost:3000
 */

const { io } = require("socket.io-client");
const readline = require("readline");

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const TOKEN = process.env.TOKEN;
const API_KEY = process.env.API_KEY;
const URL = process.env.GW_URL || "http://localhost:3000"; 

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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ",
});

let currentRole = "USER";
let helpPrintedForRole = false;

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

function isValidChannel(ch) {
  return ch === "general" || ch === "support";
}

function requireAdmin() {
  if (currentRole !== "ADMIN") {
    console.log("Not allowed.");
    return false;
  }
  return true;
}

const socket = io(URL, {
  path: "/realtime/socket.io",
  transports: ["websocket"], 
  auth: { token: TOKEN },
  extraHeaders: { "x-api-key": API_KEY },
});


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

socket.on("message.new", (msg) => {
  console.log("\n message.new:", msg);
  rl.prompt();
});

socket.on("auth.ok", (m) => {
  currentRole = m?.role || "USER";
  console.log("auth.ok:", m);

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

async function join(channel) {
  const res = await socket.emitWithAck("channel.join", { channel });
  console.log("join:", res);
}

async function send(channel, text) {
  const res = await socket.emitWithAck("message.send", {
    channel,
    content: text,
  });
  console.log("send:", res);
}

// IMPORTANT: via Gateway your HTTP endpoints are under /realtime/...
async function history(channel) {
  const res = await fetch(`${URL}/realtime/messages?channel=${encodeURIComponent(channel)}`, {
    headers: {
      "x-api-key": API_KEY,
      Authorization: `Bearer ${TOKEN}`,
    },
  });
  const data = await res.json();
  console.log("history:", data);
}

async function flushChannel(channel) {
  const res = await fetch(`${URL}/realtime/messages/flush?channel=${encodeURIComponent(channel)}`, {
    method: "DELETE",
    headers: {
      "x-api-key": API_KEY,
      Authorization: `Bearer ${TOKEN}`,
    },
  });
  const data = await res.json();
  console.log("flush:", data);
}

async function deleteMessage(id) {
  const res = await fetch(`${URL}/realtime/messages/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      "x-api-key": API_KEY,
      Authorization: `Bearer ${TOKEN}`,
    },
  });
  const data = await res.json();
  console.log("del:", data);
}

rl.on("line", async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return rl.prompt();

  const [cmdRaw, arg1Raw, ...rest] = trimmed.split(" ");
  const cmd = (cmdRaw || "").toLowerCase();
  const arg1 = arg1Raw;
  const text = rest.join(" ");

  try {
    if (cmd === "help") {
      printHelp();
    } else if (cmd === "join") {
      if (!arg1 || !isValidChannel(arg1)) {
        console.log("Usage: join <general|support>");
      } else {
        await join(arg1);
      }
    } else if (cmd === "send") {
      if (!arg1 || !isValidChannel(arg1) || !text) {
        console.log("Usage: send <general|support> <text...>");
      } else {
        await send(arg1, text);
      }
    } else if (cmd === "history") {
      if (!arg1 || !isValidChannel(arg1)) {
        console.log("Usage: history <general|support>");
      } else {
        await history(arg1);
      }
    } else if (cmd === "flush") {
      if (!requireAdmin()) return rl.prompt();
      if (!arg1 || !isValidChannel(arg1)) {
        console.log("Usage: flush <general|support>");
      } else {
        await flushChannel(arg1);
      }
    } else if (cmd === "del" || cmd === "delete") {
      if (!requireAdmin()) return rl.prompt();
      if (!arg1) {
        console.log("Usage: del <messageId>");
      } else {
        await deleteMessage(arg1);
      }
    } else if (cmd === "exit" || cmd === "quit") {
      rl.close();
      socket.disconnect();
      process.exit(0);
    } else {
      console.log("Unknown command. Type: help");
    }
  } catch (e) {
    console.error("Error:", e?.message || e);
  }

  rl.prompt();
});

rl.on("close", () => {
  socket.disconnect();
  process.exit(0);
});
