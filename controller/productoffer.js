// models/productOffer.js
const mongoose = require('mongoose');

const productOfferSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  offerPrice: {
    type: Number,
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
});

const ProductOffer = mongoose.model('ProductOffer', productOfferSchema);

module.exports = ProductOffer;
