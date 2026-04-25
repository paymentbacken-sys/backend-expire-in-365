const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const requestIp = require("request-ip"); // ✅ NEW

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 Load students
let students = JSON.parse(fs.readFileSync("students.json"));

// Store sessions
let activeSessions = {};

// 🔥 Store demo users
let demoUsers = {};

const EXPIRY_DAYS = 365;
const DEMO_MINUTES = 5;

// 🔹 Check 365-day expiry
function isExpired(registeredOn) {
  const regDate = new Date(registeredOn);
  const today = new Date();

  const diffTime = today - regDate;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  return diffDays > EXPIRY_DAYS;
}

// === POST /login ===
app.post("/login", (req, res) => {
  const { email, deviceId } = req.body; // ✅ NEW
  if (!email) return res.status(400).json({ error: "Email is required" });

  const normalizedEmail = email.toLowerCase();
  const clientIp = requestIp.getClientIp(req); // ✅ NEW

  // 🔍 Check registered student
  const student = students.find(
    s => s.email.toLowerCase() === normalizedEmail
  );

  // ✅ REGISTERED USER
  if (student) {
    if (isExpired(student.registeredOn)) {
      return res.json({ expired: true });
    }

    const token = Math.random().toString(36).substring(2);
    activeSessions[normalizedEmail] = token;

    return res.json({ token });
  }

  // 🔥 DEMO USER (IP + DEVICE LIMIT)
  const now = Date.now();

  // UNIQUE KEY
  const demoKey = normalizedEmail + "_" + clientIp + "_" + deviceId;

  if (!demoUsers[demoKey]) {
    demoUsers[demoKey] = now;
  }

  const firstLogin = demoUsers[demoKey];
const diffMinutes = (now - firstLogin) / (1000 * 60);

if (diffMinutes > DEMO_MINUTES) {
  return res.json({ demoExpired: true });
}

  const token = Math.random().toString(36).substring(2);
  activeSessions[normalizedEmail] = token;

  return res.json({ token, demo: true });
});


// === POST /validate ===
app.post("/validate", (req, res) => {
  const { email, token, deviceId } = req.body; // ✅ NEW
  if (!email || !token) return res.json({ valid: false });

  const normalizedEmail = email.toLowerCase();
  const clientIp = requestIp.getClientIp(req); // ✅ NEW

  const student = students.find(
    s => s.email.toLowerCase() === normalizedEmail
  );

  // ✅ REGISTERED USER
  if (student) {
    if (isExpired(student.registeredOn)) {
      return res.json({ valid: false, expired: true });
    }

    return res.json({
      valid: activeSessions[normalizedEmail] === token
    });
  }

  // 🔥 DEMO USER CHECK
  const demoKey = normalizedEmail + "_" + clientIp + "_" + deviceId;

  const firstLogin = demoUsers[demoKey];

  if (!firstLogin) return res.json({ valid: false });

  const now = Date.now();
const diffMinutes = (now - firstLogin) / (1000 * 60);

if (diffMinutes > DEMO_MINUTES) {
  return res.json({ valid: false, demoExpired: true });
}

  return res.json({
    valid: activeSessions[normalizedEmail] === token
  });
});

// Serve frontend
app.use(express.static(path.join(__dirname, "Public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "Public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
