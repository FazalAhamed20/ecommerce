// Import the necessary modules
const mongoose = require('mongoose');
const User=require('../controller/usercontroller')

// Define the RateUs schema
const rateUsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',  // Assuming you have a User model
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  feedback: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create a RateUs model using the schema
const RateUs = mongoose.model('RateUs', rateUsSchema);

// Export the RateUs model
module.exports = RateUs;
