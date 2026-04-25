const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const requestIp = require("request-ip");

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 Load students
let students = JSON.parse(fs.readFileSync("students.json"));

// Store sessions
let activeSessions = {};

// 🔥 Store demo users (temporary memory)
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

// =======================
// ✅ LOGIN API
// =======================
app.post("/login", (req, res) => {
  const { email, deviceId } = req.body;

  if (!email) return res.status(400).json({ error: "Email is required" });

  const normalizedEmail = email.toLowerCase();
  const clientIp = requestIp.getClientIp(req);

  // 🔍 Check registered student
  const student = students.find(
    s => s.email.toLowerCase() === normalizedEmail
  );

  // =======================
  // ✅ REGISTERED USER
  // =======================
  if (student) {
    if (isExpired(student.registeredOn)) {
      return res.json({ expired: true });
    }

    const token = Math.random().toString(36).substring(2);
    activeSessions[normalizedEmail] = token;

    return res.json({ token });
  }

  // =======================
  // 🔥 DEMO USER LOGIC
  // =======================
  const demoKey = normalizedEmail + "_" + clientIp + "_" + deviceId;
  const now = Date.now();

  // First time
  if (!demoUsers[demoKey]) {
    demoUsers[demoKey] = {
      firstLogin: now,
      expired: false
    };
  }

  const demo = demoUsers[demoKey];

  // 🚫 Already expired → block forever
  if (demo.expired) {
    return res.json({ demoExpired: true });
  }

  const diffMinutes = (now - demo.firstLogin) / (1000 * 60);

  // ⏳ Expire after time → mark permanently
  if (diffMinutes > DEMO_MINUTES) {
    demo.expired = true;
    return res.json({ demoExpired: true });
  }

  // ✅ Allow demo login
  const token = Math.random().toString(36).substring(2);
  activeSessions[normalizedEmail] = token;

  return res.json({ token, demo: true });
});


// =======================
// ✅ VALIDATE API
// =======================
app.post("/validate", (req, res) => {
  const { email, token, deviceId } = req.body;

  if (!email || !token) return res.json({ valid: false });

  const normalizedEmail = email.toLowerCase();
  const clientIp = requestIp.getClientIp(req);

  const student = students.find(
    s => s.email.toLowerCase() === normalizedEmail
  );

  // =======================
  // ✅ REGISTERED USER
  // =======================
  if (student) {
    if (isExpired(student.registeredOn)) {
      return res.json({ valid: false, expired: true });
    }

    return res.json({
      valid: activeSessions[normalizedEmail] === token
    });
  }

  // =======================
  // 🔥 DEMO USER VALIDATION
  // =======================
  const demoKey = normalizedEmail + "_" + clientIp + "_" + deviceId;
  const demo = demoUsers[demoKey];

  if (!demo) return res.json({ valid: false });

  // 🚫 Already expired
  if (demo.expired) {
    return res.json({ valid: false, demoExpired: true });
  }

  const now = Date.now();
  const diffMinutes = (now - demo.firstLogin) / (1000 * 60);

  // ⏳ Expire and block permanently
  if (diffMinutes > DEMO_MINUTES) {
    demo.expired = true;
    return res.json({ valid: false, demoExpired: true });
  }

  return res.json({
    valid: activeSessions[normalizedEmail] === token
  });
});


// =======================
// 🌐 FRONTEND
// =======================
app.use(express.static(path.join(__dirname, "Public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "Public", "index.html"));
});


// =======================
// 🚀 START SERVER
// =======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
