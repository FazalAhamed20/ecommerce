const mongoose = require("mongoose");
const { Schema } = mongoose;

const couponSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
  },
  couponCode: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    required: true,
  },
  minPurchaseAmount: {
    type: Number,
    required: true,
  },
  discountAmount: {
    type: Number,
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  expiryDate: {
    type: Date,
    required: true,
  },
});

const Coupon = mongoose.model("Coupon", couponSchema);
module.exports = Coupon;
