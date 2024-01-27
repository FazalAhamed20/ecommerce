
const mongoose = require('mongoose');
const User=require('../models/userModel')

const reminderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to the User model
        required: true,
    },
    coffeeTime: {
        type: String,
        required: true,
    },
    phoneNumber: {
        type: String,
        required: true,
    },
});

const Reminder = mongoose.model('Reminder', reminderSchema);

module.exports = Reminder;
