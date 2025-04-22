const mongoose = require("mongoose");

const FeedbackSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
  },
  feedback: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Feedback = mongoose.model("Feedback", FeedbackSchema);
module.exports = Feedback;
