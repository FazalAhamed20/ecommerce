// Import necessary modules
const Coupon = require('../models/couponModel');
const {formatDate}=require('../util/helperfunction')
//create coupon------------------------------------------------------->
const showCreateCouponForm = async (req, res, next) => {
  const ITEMS_PER_PAGE = 4;
  try {
    const page = parseInt(req.query.page) || 1;
    const searchQuery = req.query.search || '';
    console.log(searchQuery);
    const filter = {
      $or: [
        { description: { $regex: new RegExp(searchQuery, 'i') } },
        { couponCode: { $regex: new RegExp(searchQuery, 'i') } },
      ],
    };
    const totalCoupons = await Coupon.countDocuments(filter);
    const totalPages = Math.ceil(totalCoupons / ITEMS_PER_PAGE);
    const coupons = await Coupon.find(filter)
      .sort({ _id: -1 })
      .skip((page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE);
    const formattedCoupons = coupons.map(coupon => ({
      ...coupon._doc,
      startDate: formatDate(coupon.startDate),
      expiryDate: formatDate(coupon.expiryDate),
    }));
    res.render('./coupon/coupon.ejs', {
      coupons: formattedCoupons,
      totalPages: totalPages,
      currentPage: page,
    });
  } catch (error) {
    next(error);
  }
};

  //create coupon form------------------------------------------------------->
  const createcouponform=async (req,res)=>{
    try{
            res.render('./coupon/createcoupon.ejs'); 
    }catch(error){
        next(error)
    }
  };
  //create coupon------------------------------------------------------->
const createCoupon = async (req, res) => {
  try {
    const { couponCode, description, minPurchaseAmount, discountAmount, startDate, expiryDate } = req.body;
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
//Edit coupon------------------------------------------------------->
const showEditCouponForm = async (req, res, next) => {
    try {
      const couponId = req.params.couponId;
      const coupon = await Coupon.findById(couponId);
      if (!coupon) {
        return res.status(404).send('Coupon not found');
      }
      startDate = formatDate(coupon.startDate);
      expiryDate = formatDate(coupon.expiryDate);
      res.render('./coupon/editcoupon', { coupon,startDate,expiryDate });
    } catch (error) {
      next(error);
    }
  };
//Edit couponform------------------------------------------------------->
  const editCoupon = async (req, res, next) => {
    try {
      const couponId = req.params.couponId;
      const updatedCouponData = req.body; 
      const existingCoupon = await Coupon.findById(couponId);
      if (!existingCoupon) {
        return res.status(404).json({ success: false, message: 'Coupon not found' });
      }
      existingCoupon.couponCode = updatedCouponData.couponCode;
      existingCoupon.description = updatedCouponData.description;
      existingCoupon.minPurchaseAmount = updatedCouponData.minPurchaseAmount;
      existingCoupon.discountAmount = updatedCouponData.discountAmount;
      existingCoupon.startDate = updatedCouponData.startDate;
      existingCoupon.expiryDate = updatedCouponData.expiryDate;
      const updatedCoupon = await existingCoupon.save();
      return res.json({ success: true, message: 'Coupon edited successfully', updatedCoupon });
    } catch (error) {
      console.error('Error editing coupon:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  };
//Delete coupon------------------------------------------------------->
  const deletecoupon=async(req,res)=>{
    try{
      const couponId = req.params.couponId;
      const deletecoupon=await Coupon.findOneAndDelete(couponId)
      if (deletecoupon) {
        return res.json({ success: true, message: 'Coupon deleted successfully' });
      } else {
        return res.status(404).json({ success: false, message: 'Coupon not found' });
      }

    }catch (error) {
      console.error('Error deleting coupon:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  };
  //Modules------------------------------------------------------->
module.exports = {
  showCreateCouponForm,
  createCoupon,
  createcouponform,
  showEditCouponForm,
  editCoupon,
  deletecoupon
};
