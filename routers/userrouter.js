const express = require("express");
const router = express.Router();
const controller = require('../controller/usercontroller');
const controller1 = require('../controller/otpcontrollers');
const controller2= require('../controller/resetpassword');
const controller3= require('../controller/userprofilecontroller');
const controller4= require('../controller/cartcontroller');
const controller5= require('../controller/ordercontroller');
const { verifyUser, userExist ,checkUserStatus } = require("../middlewares/session");


//user side------------------------------------------------------->
router.get("/user/home",checkUserStatus,controller.home);
router.get("/user/coffeemix",checkUserStatus,controller.coffeemix);
router.get("/user/product",checkUserStatus,verifyUser,controller.product);
router.get("/user/mainproduct/:productId",checkUserStatus,verifyUser, controller.mainproduct);
router.get('/products',checkUserStatus,verifyUser,controller. getProductsByCategory);
router.get('/user/signup',checkUserStatus,userExist,controller.signup)
router.all('/user/login',checkUserStatus,userExist,controller.login)
router.all('/login1',checkUserStatus,userExist,controller.login1)
router.get('/user/logout',verifyUser,controller.logout)
//user signup otp ------------------------------------------------------->
router.post('/send',userExist,controller1.otp1)
router.post('/verify',userExist,controller1.verify)
router.get('/resend',userExist,controller1.resend)
router.post('/verifyReferal',controller1.verifyReferal)
router.get('/logout',verifyUser,controller.logout)
//login forgot password otp------------------------------------------------------->
router.get('/user/forgot-password', controller2.showForgotPasswordForm);
router.post('/user/forgot-password', controller2.forgotPassword);
router.post('/user/reset-password', controller2.resetPassword);
router.get('/otpresend',controller2.otpresend)
//user profile------------------------------------------------------->
router.get("/user/profile",verifyUser,controller3.userprofile);
router.get("/user/mainprofile",verifyUser,controller3.usermain);
router.post("/user/edituser",verifyUser,controller3.edituser);
router.get("/user/address",verifyUser,controller3.address);
router.get("/user/addaddress",verifyUser,controller3.addaddress);
router.post('/user/addaddressform',verifyUser,controller3.addaddressform);
router.get('/user/editaddressform/:id',verifyUser,controller3.editaddressform);
router.post('/user/editaddressform/:id',verifyUser,controller3.editaddressform);
router.get('/user/deleteaddress/:id',verifyUser,controller3.deleteAddress);
//user cart------------------------------------------------------->
router.get('/user/cart',verifyUser,controller4.usercart);
router.get('/user/addtocart/:productId', verifyUser, controller4.addToCart);
router.get('/removeItem/:productId',verifyUser, controller4.removeFromCart);
router.post('/updateQuantity/:productId/:quantity',verifyUser,controller4.updatequantity);
//checkout and order------------------------------------------------------->
router.get('/user/checkout',verifyUser,controller5.checkout);
router.get('/user/confirm',verifyUser,controller5.confirm);
router.get('/user/userOrder',verifyUser, controller5.userOrder);
router.post('/create-order',verifyUser,controller5.createOrder);
router.post('/process-payment',verifyUser, controller5.processPayment);
router.post('/cancel-order',verifyUser,controller5.cancelorder )
router.post('/cancelProduct',verifyUser,controller5.cancelProduct)
router.get('/download-invoice/:orderId',verifyUser,controller5.downloadInvoice)












  





module.exports = router;


