const express = require('express');
const router = express.Router();
const Coupon = require('../models/couponModel');
const cartModels=require('../models/cartModel')

const validcoupon = async (req, res) => {
  
    const couponCode = req.query.code;

    console.log("couponcode", couponCode);

    try {
        const userId = req.session.user._id;
    console.log(userId);
        const coupon = await Coupon.findOne({ couponCode });
        console.log(coupon);
        const cart = await cartModels.findOne({ userId }).populate('products.productId', 'name price description image');
        console.log("carttotal", cart);

        if (!coupon) {
            res.json({
                valid: false,
                message: 'Invalid coupon code.',
            });
            return;
        }

        const currentDate = new Date();
        console.log('currentDate:', currentDate);
        console.log('startDate:', coupon.startDate);
        console.log('expiryDate:', coupon.expiryDate);

        if (currentDate < coupon.startDate || currentDate > coupon.expiryDate) {
            res.json({
                valid: false,
                message: 'Coupon is expired or not yet valid.',
            });
            return;
        }

        // Use the total amount from the cart instead of the hardcoded value
        const originalTotal = cart.totals.grandTotal; // Adjust based on your actual cart model structure
        const discountAmount = coupon.discountAmount;

        // Calculate discounted total
        const discountedTotal = Math.max(originalTotal - discountAmount, 0);

        console.log('originalTotal:', originalTotal);
        console.log('discountAmount:', discountAmount);
        console.log('discountedTotal:', discountedTotal);

        res.json({
            valid: true,
            discountedTotal: discountedTotal.toFixed(2),
        });
    } catch (error) {
        console.error('Error validating coupon:', error);
        res.status(500).json({
            error: 'Internal server error',
        });
    }
};



module.exports = {
    validcoupon
}
