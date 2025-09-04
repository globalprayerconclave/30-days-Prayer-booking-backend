// backend/server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Schema + Model
const bookingSchema = new mongoose.Schema({
  personName: { type: String, required: true },   // leader's name
  churchName: { type: String, required: true },   // church name
  state: { type: String, required: true },
  date: { type: Date, required: true },
  mobile: { type: String, required: true },
  email: { type: String } // optional
});

const Booking = mongoose.model("Booking", bookingSchema);

// ✅ POST route → save a new booking with restrictions
app.post("/api/bookings", async (req, res) => {
  try {
    const { state, churchName, date } = req.body;

    // Rule 1: One booking per state + date
    const existingDateBooking = await Booking.findOne({ state, date });
    if (existingDateBooking) {
      return res
        .status(400)
        .json({ error: "That date is already booked for this state." });
    }

    // Rule 2: One booking per state + church (lifetime, regardless of date)
    const existingChurchBooking = await Booking.findOne({ state, churchName });
    if (existingChurchBooking) {
      return res
        .status(400)
        .json({ error: "This church has already booked this state." });
    }

    // Save new booking
    const booking = new Booking(req.body);
    await booking.save();

    res.status(201).json({ message: "✅ Booking saved successfully!", booking });
  } catch (err) {
    console.error("Error saving booking:", err);
    res.status(500).json({ error: "❌ Failed to save booking" });
  }
});

// GET route → fetch bookings (can filter by state)
app.get("/api/bookings", async (req, res) => {
  try {
    const { state } = req.query;

    let query = {};
    if (state) {
      query.state = state;
    }

    const bookings = await Booking.find(query).sort({ date: 1 });
    res.json(bookings);
  } catch (err) {
    console.error("Error fetching bookings:", err);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});


// ✅ GET booked dates for a state
app.get("/api/bookings/dates/:state", async (req, res) => {
  try {
    const state = req.params.state;
    const bookings = await Booking.find({ state: state });
    const bookedDates = bookings.map(b => b.date.toISOString().split("T")[0]); // YYYY-MM-DD
    res.json(bookedDates);
  } catch (err) {
    console.error("Error fetching booked dates:", err);
    res.status(500).json({ error: "Failed to fetch booked dates" });
  }
});


// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);
