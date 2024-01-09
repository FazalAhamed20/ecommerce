const orderModels = require('../models/orderModel');
const cartModels = require('../models/cartModel');
const Address = require('../models/addressModel');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const moment = require('moment');
const CanceledOrder = require('../models/orderCancelModel');

var instance = new Razorpay({
  key_id: 'rzp_test_YCxRFmZdRfF2Qw',
  key_secret: 'zeSoohctIJNkPlHsAeDwKUR2',
});
//generate orderid------------------------------------------------------->
function generateOrderID() {
  const safeIndex = Math.floor(Math.random() * 1000000);
  const sixDigitID = String(safeIndex + 1).padStart(6, '0');
  return 'ORD#' + sixDigitID;
}
//order time------------------------------------------------------->
function getCurrentTime() {
  return moment().format('HH:mm');
}

const createOrderData = async (userId, paymentMethod, selectedAddress) => {
  const orderID = generateOrderID();
  const currentDate = moment();
  const orderDate = currentDate.format('ddd MMM DD YYYY');
  const orderDateTime = moment();
  const orderTime = getCurrentTime();
  const orderDateTimeWithTime = moment(orderDateTime).set('hour', orderTime.split(':')[0]).set('minute', orderTime.split(':')[1]);
  const deliveryDateTime = moment(orderDateTimeWithTime).add(40, 'minutes');
  const deliveryDate = deliveryDateTime.format('ddd MMM DD YYYY ');
  const deliveryTime = deliveryDateTime.format('HH:mm');
  console.log(`Ordered Date: ${orderDate}`);

  const cart = await cartModels.findOne({ userId });
  if (cart) {
      await cart.populate('products.productId', 'name price description image');
  }
  const products = cart.products.map(cartItem => ({
      product: cartItem.productId,
      name: cartItem.productId && cartItem.productId.name,
      quantity: cartItem.quantity,
  }));
  const totals = {
      subtotal: cart.totals.subtotal,
      tax: cart.totals.tax,
      shipping: cart.totals.shipping,
      grandTotal: cart.totals.grandTotal,
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
        console.log("User Addresses:", addresses);
        if (!addresses || addresses.length === 0) {
            return res.status(404).json({ success: false, message: 'User addresses not found' });
        }
        const cart = await cartModels.findOne({ userId }).populate('products.productId', 'name price description image');
        if (!cart || cart.products.length === 0) {
            req.flash('error', 'Your cart is empty. Cannot create an order.');
            return res.redirect('/user/cart');
        }
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }
        const razorpayOrder = {};
        const paymentMethod=[];
        res.render('./orders/checkout', { pageTitle: 'checkout', addresses, user: req.session.user, cart: cart.products, totals: cart.totals,messages: req.flash(),orderID,razorpayOrder,paymentMethod });
    } catch (error) {
        console.error('Error fetching user addresses and cart data for checkout:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
//save orders details at database------------------------------------------------------->
const createOrder = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { paymentMethod, selectedAddressIndex } = req.body;

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

    const orderData = await createOrderData(userId, paymentMethod, selectedAddress);
 

    if (paymentMethod === 'Cash on Delivery') {
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
          paymentMethod, // Add paymentMethod to the render parameters
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
      return res.render('./orders/userorder', { pageTitle: 'userorder', user: null, orders: [] });
    }
    const userId = req.session.user._id;
    const orders = await orderModels.find({ customer: userId }).populate({
      path: 'products.product',
      model: 'Product',
      select: 'name price description image', 
    }).exec();
    res.render('./orders/userorder', { pageTitle: 'userorder', user: req.session.user, orders });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

const processPayment = async (req, res) => {
  try {
    const userId = req.session.user._id;
    console.log("razorpay",req.body);
      const { payment_id, order_id, signature,paymentMethod,selectedAddressIndex } = req.body;
      const addresses = await Address.find({ userId });
      const selectedAddress = addresses[selectedAddressIndex];
      const secret = 'zeSoohctIJNkPlHsAeDwKUR2'; 

      // Verify the signature
      const generatedSignature = crypto.createHmac('sha256', secret)
          .update(order_id + '|' + payment_id)
          .digest('hex');

      if (generatedSignature === signature) {
          // Signature is valid
          console.log('Signature verification successful');
          console.log('Payment ID:', payment_id);
          console.log('Order ID:', order_id);
          const orderData = await createOrderData(userId, paymentMethod, selectedAddress);
          console.log("order",orderData);
          const newOrder = new orderModels(orderData);
      const savedOrder = await newOrder.save();
      await cartModels.findOneAndDelete({ userId });

      res.json({ success: true });
    
      } else {
          // Signature is invalid
          console.error('Signature verification failed');
          res.status(400).json({ error: 'Invalid signature' });
      }
  } catch (error) {
      console.error('Error processing payment:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
};


const cancelorder=async (req, res) => {
  try {
      // Extract order ID and cancellation reason from the request body
      const { orderID, cancellationReason } = req.body;

      console.log({orderID,cancellationReason});

      // Create a new instance of the CanceledOrder model
      const canceledOrder = new CanceledOrder({
          orderID: orderID,
          reason: cancellationReason,
      });

      // Save the canceled order to the database
      const savedOrder = await canceledOrder.save();

      // Update the order status in your main orders collection to 'canceled'
      // Perform any other necessary actions

      res.status(200).json({ message: 'Order canceled and reason saved', canceledOrder: savedOrder });
  } catch (error) {
      console.error('Error saving canceled order:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
};

//modules------------------------------------------------------->
 module.exports={
    checkout,
    createOrder,
    userOrder,
    processPayment,
    confirm,
    cancelorder
 }  