const express = require('express');
const router = express.Router();
const Coupon = require('../models/couponModel');
const cartModels=require('../models/cartModel')
const mongoose = require('mongoose');


const validcoupon = async (req, res) => {
    const couponCode = req.query.code;

    try {
        const userId = req.session.user._id;
        const coupon = await Coupon.findOne({ couponCode });
        const cart = await cartModels.findOne({ userId }).populate('products.productId', 'name price description image');

        if (!coupon) {
            res.json({
                valid: false,
                message: 'Invalid coupon code.',
            });
            return;
        }

        const currentDate = new Date();

        if (currentDate < coupon.startDate || currentDate > coupon.expiryDate) {
            res.json({
                valid: false,
                message: 'Coupon is expired or not yet valid.',
            });
            return;
        }

        const originalTotal = cart.totals.grandTotal;
        const discountAmount = coupon.discountAmount;
        const discountedTotal = Math.max(originalTotal - discountAmount, 0);

        // Update the discount fields in the cart
        await cartModels.findOneAndUpdate(
            { userId },
            { $set: { 'totals.discountAmount': discountAmount, 'totals.discountedTotal': discountedTotal } },
            { new: true }
        );

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

const removeCoupon = async (req, res) => {
    const couponCode = req.query.code;

    try {
        const userId = req.session.user._id;
        const coupon = await Coupon.findOne({ couponCode });

        if (!coupon) {
            res.status(404).json({
                error: 'Coupon not found.',
            });
            return;
        }

        const cart = await cartModels.findOne({ userId }).populate('products.productId', 'name price description image');

        // Remove the discount fields from the cart
        await cartModels.findOneAndUpdate(
            { userId },
            { $set: { 'totals.discountAmount': 0, 'totals.discountedTotal': cart.totals.grandTotal } },
            { new: true }
        );

        res.status(200).json({
            success: true,
        });
    } catch (error) {
        console.error('Error removing discount:', error);
        res.status(500).json({
            error: 'Internal server error',
        });
    }
};





module.exports = {
    validcoupon,
    removeCoupon
}
