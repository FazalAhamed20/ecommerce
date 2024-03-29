const express = require("express");
const router = express.Router();
const controller2 = require('../controller/admincontroller');
const catagorycontroller=require('../controller/categorycontroller')
const productcontroller=require('../controller/productcontroller')
const categoryoffercontroller=require('../controller/categoryOffercontroller')
const productoffercontroller=require('../controller/productoffercontroller')
const couponcontroller=require('../controller/couponcontroller')
const bodyParser = require('body-parser');
const upload = require("../middlewares/multer");
const { verifyAdmin, adminExist } = require("../middlewares/session");
//admin side------------------------------------------------------->
router.get("/admin/login",controller2.admin);
router.get("/admin", controller2.admin);
router.all("/dashboard",adminExist,controller2.dashboard)
router.get("/adhome",verifyAdmin,controller2.adhome)
router.all("/adlog",verifyAdmin,controller2.users)
router.post("/block",verifyAdmin,controller2.block)
router.post('/unblock',verifyAdmin,controller2.unblock)
router.get('/adlogout',verifyAdmin,controller2.logout)

//category side------------------------------------------------------->
router.get('/category',verifyAdmin,catagorycontroller.categoryList)
router.get('/createcat',verifyAdmin,catagorycontroller.createcat)
router.post('/addcat',verifyAdmin,catagorycontroller.addcat)
router.post('/editcat/:id',verifyAdmin,catagorycontroller.editcat)
router.get('/editform/:id',verifyAdmin,catagorycontroller.editform)
router.get('/confirmdel/:id',verifyAdmin,catagorycontroller.confirmdel)
router.post('/deletecat/:id',verifyAdmin,catagorycontroller.deletecat)
//product side------------------------------------------------------->
router.get('/admin/product',verifyAdmin,productcontroller.productList)
router.get('/addform',verifyAdmin,productcontroller.addform)
router.post('/addproduct',verifyAdmin,upload.single('image'),productcontroller.addproduct)
router.get('/product/editform/:id',verifyAdmin,upload.single('image'),productcontroller.editform)
router.post('/product/updateproduct/:id',verifyAdmin,upload.single('image'),productcontroller.updateproduct)
router.get('/product/deleteproduct/:id',verifyAdmin,productcontroller.deleteproduct)
//order side------------------------------------------------------->
router.get("/admin/userorder",verifyAdmin,controller2.userOrder);
router.post("/updateOrderStatus",verifyAdmin,controller2.updateOrderstatus);
router.get('/download-sales-report', verifyAdmin, controller2.generateSalesReport);
//category offers------------------------------------------------------->
router.get('/admin/categoryoffer',verifyAdmin,categoryoffercontroller.CategoryOffers)
router.post('/admin/edit-offer/:category/:startDate/:expiryDate/:percentage',verifyAdmin,categoryoffercontroller.editOffer);
router.delete('/admin/delete-offer/:categoryId', verifyAdmin, categoryoffercontroller.deleteOffer);
//coupon------------------------------------------------------->
router.get('/admin/coupon',verifyAdmin,couponcontroller.showCreateCouponForm)
router.post('/admin/create-coupon',verifyAdmin,couponcontroller.createCoupon)
router.get('/coupons/create',verifyAdmin,couponcontroller.createcouponform)
router.get('/edit-coupon/:couponId',verifyAdmin, couponcontroller.showEditCouponForm);
router.put('/admin/edit-coupon/:couponId',verifyAdmin, couponcontroller.editCoupon);
router.delete('/delete-coupons/:couponId',verifyAdmin,couponcontroller.deletecoupon)
//product offers------------------------------------------------------->
router.get('/admin/productoffer',verifyAdmin,productoffercontroller.ProductOffers)
router.put('/admin/edit-product-offer/:productId/:startDate/:expiryDate/:percentage',verifyAdmin,productoffercontroller.editProductOffer);
router.delete('/admin/delete-product-offer/:productId',verifyAdmin,productoffercontroller.deleteProductOffer)




  








module.exports=router

