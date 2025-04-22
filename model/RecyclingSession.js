const mongoose = require("mongoose");

const RecyclingSessionSchema = new mongoose.Schema({
  userName: {
    type: String,
    default: null,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  bottles: {
    type: Number,
    required: true,
  },
  cups: {
    type: Number,
    required: true,
  },
  points: {
    type: Number,
    required: true,
  },
  recycledAt: {
    type: Date,
    default: Date.now,
  },
});

const RecyclingSession = mongoose.model(
  "RecyclingSession",
  RecyclingSessionSchema
);
module.exports = RecyclingSession;
