const orderModels = require('../models/orderModel');
const cartModels = require('../models/cartModel');
const Address = require('../models/addressModel');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const CanceledOrder = require('../models/orderCancelModel');
const Product = require('../models/productModel');
const Wallet=require('../models/walletModel')
const User=require('../models/userModel')
const puppeteer = require('puppeteer');
const fs = require('fs');
const ejs = require('ejs');
const Coupon=require('../models/couponModel')
const {generateOrderID,getCurrentTime,formatDate}=require('../util/helperfunction')
require('dotenv').config();
//Razorpay Instance------------------------------------------------------->
var instance = new Razorpay({
  key_id:process.env.Razorpay_key_id,
  key_secret:process.env.Razorpay_key_secret,
});
//Order data------------------------------------------------------->
const createOrderData = async (userId, paymentMethod, selectedAddress, couponCode) => {
  const orderID = generateOrderID();
  const currentDate = new Date();
  const orderDate = formatDate(currentDate);
  const orderDateTime = new Date();
  const orderTime = getCurrentTime();
  orderDateTime.setHours(parseInt(orderTime.split(':')[0], 10));
orderDateTime.setMinutes(parseInt(orderTime.split(':')[1], 10));
const deliveryDateTime = new Date(orderDateTime.getTime() + 40 * 60000);
const deliveryDate = formatDate(deliveryDateTime);
const deliveryTime = getCurrentTime();
  const appliedCoupon = await Coupon.findOne({ couponCode });
  const cart = await cartModels.findOne({ userId });
  if (cart) {
    await cart.populate('products.productId', 'name price description image');
  }
  let discountAmount = 0;
  let discountTotal = 0;
  let couponCodeApplied = '';
  if (appliedCoupon) {
    discountAmount = appliedCoupon.discountAmount;
    couponCodeApplied = appliedCoupon.couponCode;
  }
  const grandTotalAfterDiscount = cart.totals.grandTotal - discountAmount;
  const products = cart.products.map(cartItem => ({
    product: cartItem.productId,
    name: cartItem.productId && cartItem.productId.name,
    quantity: cartItem.quantity,
  }));
  const totals = {
    subtotal: cart.totals.subtotal,
    tax: cart.totals.tax,
    shipping: cart.totals.shipping,
    grandTotal: grandTotalAfterDiscount,
    couponCode: couponCodeApplied,
    discountAmount: discountAmount,
    discountTotal: grandTotalAfterDiscount,
  };
  return {
    orderID,
    customer: userId,
    products,
    address: selectedAddress,
    totals,
    orderDate,
    orderTime,
    deliveryDate,
    deliveryTime,
    paymentMethod,
    status: 'Pending',
  };
};

//order confirmed------------------------------------------------------->
const confirm = async (req, res) => {
  try {
      const user = req.session.user;

      res.render("./orders/confirm", { pageTitle: "confirm", user});
  } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
//checkout------------------------------------------------------->
const checkout = async (req, res) => {
    try {
      const orderID=generateOrderID();
        const userId = req.session.user._id;
        const addresses = await Address.find({ userId });
        const cart = await cartModels.findOne({ userId }).populate('products.productId', 'name price description image');
        if (!cart || cart.products.length === 0) {
            req.flash('error', 'Your cart is empty. Cannot create an order.');
            return res.redirect('/user/cart');
        }
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }
        const user = await User.findById(userId);
        const walletId = user.wallet;
        const wallet = await Wallet.findById(walletId);
        const razorpayOrder = {};
        const paymentMethod=[];
        res.render('./orders/checkout', { pageTitle: 'checkout', addresses, user: req.session.user, cart: cart.products, totals: cart.totals,messages: req.flash(),orderID,razorpayOrder,paymentMethod,wallet });
    } catch (error) {
        console.error('Error fetching user addresses and cart data for checkout:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
//save Address------------------------------------------------------->
const saveAddress=async (req, res) => {
  try {
    if (req.session.user) {
      const userId = req.session.user._id;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).send('User not found');
      }
      const { mobile, email, pincode, houseName, locality, city, district, state } = req.body;
      const newAddress = new Address({
        userId: user._id,
        mobile,
        email,
        pincode,
        houseName,
        locality,
        city,
        district,
        state,
      });
      await newAddress.save();
      user.addresses = user.addresses || [];
      user.addresses.push(newAddress._id);
      await user.save();
      req.session.user = user;
      res.status(201).json({ message: 'Address saved successfully' });
    } else {
      res.status(401).send('Unauthorized');
    }
  } catch (error) {
    console.error('Error saving address:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
//save orders details at database------------------------------------------------------->
const createOrder = async (req, res) => {
  try {
    const userId = req.session.user._id;
    console.log(req.body);
    const { paymentMethod, selectedAddressIndex, couponCode } = req.body;
    console.log({ paymentMethod, selectedAddressIndex, couponCode } );

    if (!paymentMethod || !selectedAddressIndex || !selectedAddressIndex.length) {
      req.flash('error', 'Address or Payment is not selected');
      return res.redirect('/user/checkout');
    }
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const addresses = await Address.find({ userId });
    const selectedAddress = addresses[selectedAddressIndex];

    if (!selectedAddress) {
      return res.status(404).json({ error: 'Selected address not found' });
    }
    const orderData = await createOrderData(userId, paymentMethod, selectedAddress, couponCode);
    if (paymentMethod === 'Cash on Delivery') {
      const newOrder = new orderModels(orderData);
      const savedOrder = await newOrder.save();
      await cartModels.findOneAndDelete({ userId });
      setTimeout(() => {
        return res.render('./orders/confirm', { pageTitle: 'success', user: req.session.user, paymentMethod });
      }, 1800);
    } else if (paymentMethod === 'Wallet') {
      const user = await User.findById(userId);
        const walletId = user.wallet;
        const userWallet = await Wallet.findById(walletId);
      if (!userWallet) {
        req.flash('error', 'User wallet not found');
        return res.redirect('/user/checkout');
      }
      const orderTotal = orderData.totals.grandTotal;
      if (userWallet.balance < orderTotal) {
        req.flash('error', 'Insufficient funds in the wallet');
        return res.redirect('/user/checkout');
      }
      userWallet.balance -= orderTotal;
      await userWallet.save();
      const newOrder = new orderModels(orderData);
      const savedOrder = await newOrder.save();
      await cartModels.findOneAndDelete({ userId });
      setTimeout(() => {
        return res.render('./orders/confirm', { pageTitle: 'success', user: req.session.user, paymentMethod });
      }, 1800);
    } else {
      const razorpayOptions = {
        amount: orderData.totals.grandTotal * 100,
        currency: 'INR',
        receipt: orderData.orderID,
      };
      console.log(razorpayOptions);
      instance.orders.create(razorpayOptions, function (err, razorpayOrder) {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Razorpay order creation failed' });
        }
        return res.render('./orders/razorpay-checkout', {
          pageTitle: 'Razorpay Checkout',
          user: req.session.user,
          addresses,
          cart: orderData.products,
          totals: orderData.totals,
          messages: req.flash(),
          orderID: orderData.orderID,
          razorpayOrder,
          paymentMethod,
          selectedAddressIndex,
        });
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
//user orders------------------------------------------------------->  
const userOrder = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.render('./orders/userorder', { pageTitle: 'userorder', user: null, orders: [], totalPages: 0, page: 1, limit: 3 });
    }
    const userId = req.session.user._id;
    const limit = parseInt(req.query.limit) || 3; 
    const totalOrders = await orderModels.countDocuments({ customer: userId });
    const totalPages = Math.ceil(totalOrders / limit);
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    const orders = await orderModels.find({ customer: userId })
      .populate({
        path: 'products.product',
        model: 'Product',
        select: 'name price description image',
      })
      .skip(skip)
      .sort({_id:-1})
      .limit(limit)
      .exec();
    const formattedOrders = orders.map((order) => ({
      ...order._doc,
      orderDate: order.orderDate.toLocaleDateString('en-IN'),
      deliveryDate: order.deliveryDate.toLocaleDateString('en-IN'), 
    }));
    res.render('./orders/userorder', { pageTitle: 'userorder', user: req.session.user, orders: formattedOrders, page, limit, totalPages });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
//razorpay online payment-------------------------------------------------------> 
const processPayment = async (req, res) => {
  try {
    const userId = req.session.user._id;
      const { payment_id, order_id, signature,paymentMethod,selectedAddressIndex } = req.body;
      const addresses = await Address.find({ userId });
      const selectedAddress = addresses[selectedAddressIndex];
      const secret =process.env.Razorpay_key_secret; 
      const generatedSignature = crypto.createHmac('sha256', secret)
          .update(order_id + '|' + payment_id)
          .digest('hex');
      if (generatedSignature === signature) {
          const orderData = await createOrderData(userId, paymentMethod, selectedAddress);
          console.log("order",orderData);
          const newOrder = new orderModels(orderData);
      const savedOrder = await newOrder.save();
      await cartModels.findOneAndDelete({ userId });
      res.json({ success: true });
      } else {
          console.error('Signature verification failed');
          res.status(400).json({ error: 'Invalid signature' });
      }
  } catch (error) {
      console.error('Error processing payment:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
};
//cancellation of order-------------------------------------------------------> 
const cancelorder = async (req, res) => {
  try {
    const { orderID, cancellationReason } = req.body;
    const canceledOrder = new CanceledOrder({
      orderID: orderID,
      reason: cancellationReason,
    });
    const savedOrder = await canceledOrder.save();
    const updatedOrder = await orderModels.findOneAndUpdate(
      { orderID: orderID },
      { $set: { status: 'cancelled' } },
      { new: true }
    );
    if (!updatedOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.status(200).json({
      message: 'Order canceled, reason saved, and main order status updated',
      canceledOrder: savedOrder,
      updatedOrder: updatedOrder,
    });
  } catch (error) {
    console.error('Error saving canceled order:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
 //cancel of a single product------------------------------------------------------->   
const cancelProduct = async (req, res) => {
  const { orderId, productId } = req.body;
  try {
    const order = await orderModels.findOne({ orderID: orderId }).populate('products.product');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    const productIndex = order.products.findIndex(
      (product) => product.product._id.toString() === productId
    );
    if (productIndex === -1) {
      return res.status(404).json({ success: false, message: 'Product not found in the order' });
    }
    const cancelledProduct = order.products[productIndex];
    const productName = cancelledProduct.product ? cancelledProduct.product.productName : 'Unknown Product';
    const price = isNaN(cancelledProduct.product?.price) ? 0 : cancelledProduct.product.price;
    const tax = isNaN(cancelledProduct.product?.tax) ? 0 : cancelledProduct.product.tax;
    const cancelledAmount = (cancelledProduct.quantity * price) + tax;
    const updatedProductQuantity = cancelledProduct.product.quantity + cancelledProduct.quantity;
    const result = await orderModels.updateOne(
      { orderID: orderId },
      {
        $pull: { products: { _id: cancelledProduct._id } },
        $inc: {
          'totals.subtotal': -price * cancelledProduct.quantity,
          'totals.tax': -tax * cancelledProduct.quantity,
          'totals.shipping': 0,
          'totals.grandTotal': -cancelledAmount,
        },
      }
    );
    await Product.updateOne(
      { _id: productId },
      { $set: { quantity: updatedProductQuantity } }
    );
    if (result.modifiedCount > 0) {
      res.json({ success: true, message: 'Product canceled successfully' });
    } else {
      res.status(404).json({ success: false, message: 'Order or product not found' });
    }
  } catch (error) {
    console.error('MongoDB Error:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};
//download invoice------------------------------------------------------->   
const downloadInvoice = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const orderDetails = await orderModels
      .findOne({ orderID: orderId })
      .populate({
        path: 'products.product',
        select: 'name price',
      })
      .exec();

    if (!orderDetails) {
      console.log('Order not found');
      return res.status(404).send('Order not found');
    }
    const orderedDate = orderDetails.orderDate;
    const formattedDate = orderedDate.toLocaleDateString('en-IN');
    const templatePath = 'views/orders/invoice.ejs';
    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    const renderedHTML = ejs.render(templateContent, { orderDetails, user: req.session.user,formattedDate });

    // Launch Puppeteer with headless: 'new'
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setContent(renderedHTML);

    // Generate PDF
    const pdfBuffer = await page.pdf({ format: 'Letter' });

    // Close the browser
    await browser.close();

    
    const name = "Coffee Land"

    res.setHeader('Content-Disposition', `attachment; filename=invoice_${name}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error in downloadInvoice:', error);
    res.status(500).send('Internal Server Error: ' + error.message);
  }
};

//modules------------------------------------------------------->
 module.exports={
    checkout,
    createOrder,
    userOrder,
    processPayment,
    confirm,
    cancelorder,
    cancelProduct,
    downloadInvoice,
    saveAddress
  
 }  