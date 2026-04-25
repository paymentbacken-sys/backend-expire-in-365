const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 Load students with expiry date
let students = JSON.parse(fs.readFileSync("students.json"));

// Store active sessions
let activeSessions = {};


// 🔹 Function to check expiry
function isExpiringSoon(expiresOn) {
  const expiryDate = new Date(expiresOn);
  const today = new Date();

  expiryDate.setHours(23,59,59,999);

  const diffTime = expiryDate - today;
  const diffDays = diffTime / (1000*60*60*24);

  return diffDays <= 3 && diffDays >= 0;
}


// 🔹 Function to check if only 1 day left
function isExpiringSoon(expiresOn) {
  const expiryDate = new Date(expiresOn);
  const today = new Date();

  expiryDate.setHours(23, 59, 59, 999);

  const diffTime = expiryDate - today;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  return diffDays <= 1 && diffDays > 0;
}


// === POST /login ===
app.post("/login", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  const normalizedEmail = email.toLowerCase();

  const student = students.find(
    s => s.email.toLowerCase() === normalizedEmail
  );

  if (!student) {
    return res.status(401).json({ error: "Email not allowed" });
  }

  // 🔥 Expired check
  if (isExpired(student.expiresOn)) {
    return res.json({ expired: true });
  }

  const expiringSoon = isExpiringSoon(student.expiresOn);

  // Generate token
  const token = Math.random().toString(36).substring(2);
  activeSessions[normalizedEmail] = token;

  console.log(`✅ Login: ${normalizedEmail}`);
  res.json({ token, expiringSoon });
});


// === POST /validate ===
app.post("/validate", (req, res) => {
  const { email, token } = req.body;
  if (!email || !token) return res.json({ valid: false });

  const normalizedEmail = email.toLowerCase();

  const student = students.find(
    s => s.email.toLowerCase() === normalizedEmail
  );

  if (!student) return res.json({ valid: false });

  // 🔥 Expired check
  if (isExpired(student.expiresOn)) {
    return res.json({ valid: false, expired: true });
  }

  const valid = activeSessions[normalizedEmail] === token;
  const expiringSoon = isExpiringSoon(student.expiresOn);

  res.json({ valid, expiringSoon });
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
