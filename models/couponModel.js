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
couponSchema.pre('save', function (next) {
    // Format startDate and expiryDate to only store the date part
    this.startDate = new Date(this.startDate.getFullYear(), this.startDate.getMonth(), this.startDate.getDate());
    this.expiryDate = new Date(this.expiryDate.getFullYear(), this.expiryDate.getMonth(), this.expiryDate.getDate());
  
    next();
  });
  
const Coupon = mongoose.model("Coupon", couponSchema);
module.exports = Coupon;
