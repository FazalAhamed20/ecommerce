// Import necessary modules
const Coupon = require('../models/couponModel');

function formatDate(date) {
    if (!date) return null;
  
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); 
    const day = date.getDate().toString().padStart(2, '0');
  
    return `${year}-${month}-${day}`;
  }


const showCreateCouponForm = async (req, res, next) => {
    try {
      const coupons = await Coupon.find().sort({ _id: -1 });

      const formattedCoupons = coupons.map(coupon => ({
        ...coupon._doc,
        startDate: coupon.startDate.toLocaleDateString('en-IN'), 
        expiryDate: coupon.expiryDate.toLocaleDateString('en-IN')
      }));
  
      res.render('./coupon/coupon.ejs', { coupons: formattedCoupons });
    } catch (error) {
      next(error);
    }
  };
  
  const createcouponform=async (req,res)=>{
    try{
        
            res.render('./coupon/createcoupon.ejs');
          
    }catch(error){
        next(error)
    }
  };
const createCoupon = async (req, res) => {
  try {
    const { couponCode, description, minPurchaseAmount, discountAmount, startDate, expiryDate } = req.body;
    console.log( { couponCode, description, minPurchaseAmount, discountAmount, startDate, expiryDate });
    
    const newCoupon = new Coupon({
      couponCode,
      description,
      minPurchaseAmount,
      discountAmount,
      startDate:new Date(req.body.startDate),
      expiryDate:new Date(req.body.expiryDate),
    });
    await newCoupon.save();
    return res.status(200).json({ success: true, message: 'Coupon created successfully.' });
  } catch (error) {
    console.error('Error creating coupon:', error);
    req.flash('error', 'Failed to create coupon. Please try again.');
    res.redirect('/admin/create-coupon');
  }
};
const showEditCouponForm = async (req, res, next) => {
    try {
      const couponId = req.params.couponId;
      const coupon = await Coupon.findById(couponId);
  
      if (!coupon) {
        return res.status(404).send('Coupon not found');
      }
      startDate = formatDate(coupon.startDate);
      expiryDate = formatDate(coupon.expiryDate);
      console.log("coupon startdate",coupon.startDate);
      res.render('./coupon/editcoupon', { coupon,startDate,expiryDate });
    } catch (error) {
      next(error);
    }
  };
  
  // Handle coupon edit submission
  const editCoupon = async (req, res, next) => {
    try {
      const couponId = req.params.couponId;
      const updatedCouponData = req.body; 
  
      // Fetch the existing coupon from the database
      const existingCoupon = await Coupon.findById(couponId);
  
      if (!existingCoupon) {
        return res.status(404).json({ success: false, message: 'Coupon not found' });
      }
  
      // Update the coupon fields
      existingCoupon.couponCode = updatedCouponData.couponCode;
      existingCoupon.description = updatedCouponData.description;
      existingCoupon.minPurchaseAmount = updatedCouponData.minPurchaseAmount;
      existingCoupon.discountAmount = updatedCouponData.discountAmount;
      existingCoupon.startDate = updatedCouponData.startDate;
      existingCoupon.expiryDate = updatedCouponData.expiryDate;
  
      // Save the updated coupon to the database
      const updatedCoupon = await existingCoupon.save();
  
      // Send success response with a message
      return res.json({ success: true, message: 'Coupon edited successfully', updatedCoupon });
    } catch (error) {
      console.error('Error editing coupon:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  };
  



module.exports = {
  showCreateCouponForm,
  createCoupon,
  createcouponform,
  showEditCouponForm,
  editCoupon
};
