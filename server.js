const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// Load students
let students = JSON.parse(fs.readFileSync("students.json"));

// Active sessions
let activeSessions = {};


// ===============================
// CHECK IF EXPIRED
// ===============================
function isExpired(expiresOn) {
  const expiryDate = new Date(expiresOn);
  const today = new Date();

  expiryDate.setHours(23, 59, 59, 999);

  return today > expiryDate;
}


// ===============================
// CHECK IF EXPIRING WITHIN 3 DAYS
// ===============================
function getExpiringData(expiresOn) {
  const expiryDate = new Date(expiresOn);
  const today = new Date();

  expiryDate.setHours(23, 59, 59, 999);

  const diffTime = expiryDate - today;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  if (diffDays <= 3 && diffDays >= 0) {
    return {
      expiringSoon: true,
      expiryDate: expiresOn
    };
  }

  return {
    expiringSoon: false,
    expiryDate: expiresOn
  };
}



// ===============================
// LOGIN ROUTE
// ===============================
app.post("/login", (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const normalizedEmail = email.toLowerCase();

  const student = students.find(
    s => s.email.toLowerCase() === normalizedEmail
  );

  if (!student) {
    return res.status(401).json({ error: "Email not allowed" });
  }

  // Expired?
  if (isExpired(student.expiresOn)) {
    return res.json({ expired: true });
  }

  // Expiring data
  const expiryInfo = getExpiringData(student.expiresOn);

  // Generate token
  const token = Math.random().toString(36).substring(2);
  activeSessions[normalizedEmail] = token;

  console.log(`✅ Login: ${normalizedEmail}`);

  return res.json({
    token,
    expiringSoon: expiryInfo.expiringSoon,
    expiryDate: expiryInfo.expiryDate
  });
});



// ===============================
// VALIDATE ROUTE
// ===============================
app.post("/validate", (req, res) => {
  const { email, token } = req.body;

  if (!email || !token) {
    return res.json({ valid: false });
  }

  const normalizedEmail = email.toLowerCase();

  const student = students.find(
    s => s.email.toLowerCase() === normalizedEmail
  );

  if (!student) {
    return res.json({ valid: false });
  }

  if (isExpired(student.expiresOn)) {
    return res.json({ valid: false, expired: true });
  }

  const expiryInfo = getExpiringData(student.expiresOn);

  const valid = activeSessions[normalizedEmail] === token;

  return res.json({
    valid,
    expiringSoon: expiryInfo.expiringSoon,
    expiryDate: expiryInfo.expiryDate
  });
});



// ===============================
// FRONTEND
// ===============================
app.use(express.static(path.join(__dirname, "Public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "Public", "index.html"));
});


// ===============================
// SERVER START
// ===============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
