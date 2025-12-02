// server.js (replace your existing file with this)
const express = require("express");
const bcrypt = require("bcrypt");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

// Database setup
const db = new sqlite3.Database("./database.db", (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
    } else {
        console.log("Connected to SQLite database");

        // users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    )`);

        // trips table (path stored as JSON text)
        db.run(`CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      mode TEXT,
      start_time TEXT,
      end_time TEXT,
      duration INTEGER,
      path TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);
    }
});

// Signup endpoint
app.post("/api/signup", async(req, res) => {
    const { username, email, password } = req.body;
    try {
        const hashed = await bcrypt.hash(password, 10);
        db.run(
            "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)", [username, email, hashed],
            function(err) {
                if (err) {
                    console.error(err.message);
                    return res.status(500).json({ message: err.message });
                }
                res.status(201).json({ userId: this.lastID, message: "Account created successfully" });
            }
        );
    } catch {
        res.status(500).json({ message: "Server error" });
    }
});

// Login endpoint
app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    db.get("SELECT * FROM users WHERE email = ?", [email], async(err, user) => {
        if (err) return res.status(500).json({ message: "DB error" });
        if (!user) return res.status(401).json({ message: "Invalid credentials" });

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ message: "Invalid credentials" });

        res.json({
            message: "Login successful",
            user: { id: user.id, username: user.username },
        });
    });
});

/*
  New endpoint:
  POST /api/trip/startMode
  Body: { userId, mode }
  -> inserts a trips row with mode only and returns tripId
*/
app.post("/api/trip/startMode", (req, res) => {
    const { userId, mode } = req.body;
    if (!userId || !mode) return res.status(400).json({ message: "userId and mode required" });

    db.get("SELECT username FROM users WHERE id = ?", [userId], (err, row) => {
        if (err) return res.status(500).json({ message: "DB error" });
        if (!row) return res.status(400).json({ message: "Invalid user" });

        db.run(
            "INSERT INTO trips (user_id, username, mode) VALUES (?, ?, ?)", [userId, row.username, mode],
            function(err) {
                if (err) {
                    console.error(err.message);
                    return res.status(500).json({ message: "Failed to save mode" });
                }
                res.json({ message: "Mode saved", tripId: this.lastID });
            }
        );
    });
});

/*
  POST /api/trip
  If body.tripId provided -> UPDATE the existing trip row
  else -> INSERT a new trip row
  Body: { tripId?, userId, mode, startTime, endTime, duration, path }
*/
app.post("/api/trip", (req, res) => {
    const { tripId, userId, mode, startTime, endTime, duration, path } = req.body;

    // If updating an existing trip
    if (tripId) {
        db.run(
            "UPDATE trips SET start_time = ?, end_time = ?, duration = ?, path = ?, mode = ? WHERE id = ?", [startTime || null, endTime || null, duration || null, JSON.stringify(path || []), mode || null, tripId],
            function(err) {
                if (err) {
                    console.error(err.message);
                    return res.status(500).json({ message: "Failed to update trip" });
                }
                return res.json({ message: "Trip updated successfully", tripId });
            }
        );
        return;
    }

    // Otherwise insert a completely new trip record
    if (!userId) return res.status(400).json({ message: "userId required" });

    db.get("SELECT username FROM users WHERE id = ?", [userId], (err, row) => {
        if (err || !row) return res.status(400).json({ message: "Invalid user" });

        db.run(
            "INSERT INTO trips (user_id, username, mode, start_time, end_time, duration, path) VALUES (?, ?, ?, ?, ?, ?, ?)", [userId, row.username, mode, startTime, endTime, duration, JSON.stringify(path || [])],
            function(err) {
                if (err) {
                    console.error(err.message);
                    return res.status(500).json({ message: "Failed to save trip" });
                }
                res.json({ message: "Trip saved successfully", tripId: this.lastID });
            }
        );
    });
});

// Optional: fetch trips for user (handy for debugging)
app.get("/api/trips/:userId", (req, res) => {
    const userId = req.params.userId;
    db.all("SELECT * FROM trips WHERE user_id = ? ORDER BY id DESC", [userId], (err, rows) => {
        if (err) return res.status(500).json({ message: "DB error" });
        res.json({ trips: rows });
    });
});

app.listen(port, () => console.log(`✅ Server running at http://localhost:${port}`));
// Add a simple GET route for the root path (/)
app.get("/", (req, res) => {
    res.send("Welcome to the backend API! The server is running. API routes start with /api/");
});