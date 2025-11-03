import express from "express";
import sqlite3 from "sqlite3";
import cors from "cors";
import bodyParser from "body-parser";

const app = express();
const port = process.env.PORT || 3000;
const API_SECRET = process.env.API_SECRET || "MySuperSecretKey123!";
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || null;

app.use(cors());
app.use(bodyParser.json());

// Initialize SQLite DB
const db = new sqlite3.Database("./licenses.db");
db.run("CREATE TABLE IF NOT EXISTS licenses (key TEXT PRIMARY KEY, owner TEXT, createdAt TEXT)");

function sendWebhook(message) {
  if (!DISCORD_WEBHOOK_URL) return;
  fetch(DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [{
        title: "SDJ Licensing System Log",
        description: message,
        color: 16753920,
        timestamp: new Date()
      }]
    })
  }).catch(() => {});
}

// Create a license key
app.post("/api/create", (req, res) => {
  const { secret, owner } = req.body;
  if (secret !== API_SECRET) return res.status(403).json({ error: "Invalid secret" });

  const key = "SDJ-" + Math.random().toString(36).substring(2, 10).toUpperCase();
  const createdAt = new Date().toISOString();
  db.run("INSERT INTO licenses (key, owner, createdAt) VALUES (?, ?, ?)", [key, owner, createdAt]);
  sendWebhook(`License created for **${owner}** - Key: **${key}**`);
  res.json({ success: true, key });
});

// Verify a license
app.post("/api/verify", (req, res) => {
  const { key } = req.body;
  db.get("SELECT * FROM licenses WHERE key = ?", [key], (err, row) => {
    if (row) return res.json({ valid: true, owner: row.owner, createdAt: row.createdAt });
    res.json({ valid: false });
  });
});

// List all licenses (admin only)
app.post("/api/list", (req, res) => {
  const { secret } = req.body;
  if (secret !== API_SECRET) return res.status(403).json({ error: "Invalid secret" });
  db.all("SELECT * FROM licenses", [], (err, rows) => res.json(rows));
});

// Health check
app.get("/healthz", (req, res) => res.send("OK"));

app.listen(port, () => console.log(`✅ SDJ Licensing System API running on port ${port}`));
