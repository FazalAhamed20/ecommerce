const express = require("express");
const router = express.Router();
const controller = require('../controller/usercontroller');
const controller1 = require('../controller/otpcontrollers');
const controller2= require('../controller/resetpassword');
const controller3= require('../controller/userprofilecontroller');
const controller4= require('../controller/cartcontroller');
const controller5= require('../controller/ordercontroller');
const controller6=require('../controller/usercouponcontroller')
const { verifyUser, userExist ,checkUserStatus } = require("../middlewares/session");


//user side------------------------------------------------------->
router.get("/",checkUserStatus,controller.home);
router.get("/coffeemix",checkUserStatus,controller.coffeemix);
router.get("/product",checkUserStatus,verifyUser,controller.product);
router.get("/mainproduct/:productId",checkUserStatus,verifyUser, controller.mainproduct);
router.get('/products',checkUserStatus,verifyUser,controller. getProductsByCategory);
router.get('/signup',checkUserStatus,userExist,controller.signup)
router.all('/login',checkUserStatus,userExist,controller.login)
router.all('/login1',checkUserStatus,userExist,controller.login1)
router.get('/reminder',verifyUser,controller.reminder)
router.post('/set-reminder',verifyUser,controller.setreminder)
router.get('/logout',verifyUser,controller.logout)
//user signup otp ------------------------------------------------------->
router.post('/send',userExist,controller1.otp1)
router.post('/verify',userExist,controller1.verify)
router.get('/resend',userExist,controller1.resend)
router.post('/verifyReferal',controller1.verifyReferal)
router.get('/logout',verifyUser,controller.logout)
//login forgot password otp------------------------------------------------------->
router.get('/forgot-password', controller2.showForgotPasswordForm);
router.post('/forgot-password', controller2.forgotPassword);
router.post('/reset-password', controller2.resetPassword);
router.get('/otpresend',controller2.otpresend)
//user profile------------------------------------------------------->
router.get("/profile",verifyUser,controller3.userprofile);
router.get("/mainprofile",verifyUser,controller3.usermain);
router.post("/edituser",verifyUser,controller3.edituser);
router.get("/address",verifyUser,controller3.address);
router.get("/addaddress",verifyUser,controller3.addaddress);
router.post('/addaddressform',verifyUser,controller3.addaddressform);
router.get('/editaddressform/:id',verifyUser,controller3.editaddressform);
router.post('/editaddressform/:id',verifyUser,controller3.editaddressform);
router.get('/deleteaddress/:id',verifyUser,controller3.deleteAddress);
router.get('/rewards',verifyUser,controller3.rewards)
router.get('/rateus',verifyUser,controller3.rateus)
router.post('/submit-rating',verifyUser,controller3.submitRating)
//user cart------------------------------------------------------->
router.get('/cart',verifyUser,controller4.usercart);
router.get('/addtocart/:productId', verifyUser, controller4.addToCart);
router.get('/removeItem/:productId',verifyUser, controller4.removeFromCart);
router.post('/updateQuantity/:productId/:quantity',verifyUser,controller4.updatequantity);
//checkout and order------------------------------------------------------->
router.get('/checkout',verifyUser,controller5.checkout);
router.get('/confirm',verifyUser,controller5.confirm);
router.get('/userOrder',verifyUser, controller5.userOrder);
router.post('/create-order',verifyUser,controller5.createOrder);
router.post('/save-address',verifyUser,controller5.saveAddress)
router.post('/process-payment',verifyUser, controller5.processPayment);
router.post('/cancel-order',verifyUser,controller5.cancelorder )
router.post('/cancelProduct',verifyUser,controller5.cancelProduct)
router.get('/download-invoice/:orderId',verifyUser,controller5.downloadInvoice)
//coupon------------------------------------------------------->
router.get('/validate-coupon',verifyUser,controller6.validcoupon)
router.post('/remove-coupon',verifyUser,controller6.removeCoupon);












  





module.exports = router;


