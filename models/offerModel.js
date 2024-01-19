// models/Offer.js
const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category', // Reference the Category model
    required: true,
  },
  discountPercentage: {
    type: Number,
    required: true,
  },
  expiryDate: {
    type: Date,
    required: true,
  },
});

const Offer = mongoose.model('Offer', offerSchema);

module.exports = Offer;
