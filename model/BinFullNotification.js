// models/BinFullNotification.js
const mongoose = require('mongoose');

const BinFullNotificationSchema = new mongoose.Schema({
    binType: {
        type: String,
        enum: ['cup', 'bottle'],
        required: true,
    },
    occurredAt: {
        type: Date,
        default: Date.now,
        required: true,
    },
});

const BinFullNotification = mongoose.model("BinFullNotification", BinFullNotificationSchema);
module.exports = BinFullNotification;
