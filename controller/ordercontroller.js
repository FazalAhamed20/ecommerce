const orderModels = require('../models/orderModel');
const cartModels = require('../models/cartModel');
const Address = require('../models/addressModel');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const moment = require('moment');
const CanceledOrder = require('../models/orderCancelModel');
const Product = require('../models/productModel');
const easyinvoice = require('easyinvoice');
const pdf = require('html-pdf');
const fs = require('fs');
const ejs = require('ejs');

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
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 3; // You can adjust the default limit

      const skip = (page - 1) * limit;

      const orders = await orderModels.find({ customer: userId })
          .populate({
              path: 'products.product',
              model: 'Product',
              select: 'name price description image',
          })
          .skip(skip)
          .limit(limit)
          .exec();

      res.render('./orders/userorder', { pageTitle: 'userorder', user: req.session.user, orders, page, limit });
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


const cancelorder = async (req, res) => {
  try {
    // Extract order ID and cancellation reason from the request body
    const { orderID, cancellationReason } = req.body;

    console.log({ orderID, cancellationReason });

    // Create a new instance of the CanceledOrder model
    const canceledOrder = new CanceledOrder({
      orderID: orderID,
      reason: cancellationReason,
    });

    // Save the canceled order to the database
    const savedOrder = await canceledOrder.save();

    // Update the order status in your main orders collection to 'cancelled'
    const updatedOrder = await orderModels.findOneAndUpdate(
      { orderID: orderID },
      { $set: { status: 'cancelled' } },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Perform any other necessary actions

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

const cancelProduct = async (req, res) => {
  const { orderId, productId } = req.body;

  console.log("Cancel order", { orderId, productId });

  try {
    // Retrieve the order from the database based on orderID field
    const order = await orderModels.findOne({ orderID: orderId }).populate('products.product');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Find the product in the order with the specified productId
    const productIndex = order.products.findIndex(
      (product) => product.product._id.toString() === productId
    );

    if (productIndex === -1) {
      return res.status(404).json({ success: false, message: 'Product not found in the order' });
    }

    // Log detailed information about the cancelled product
    const cancelledProduct = order.products[productIndex];
    console.log('Cancelled Product:', cancelledProduct);

    // Log the product name and the total amount to be subtracted
    const productName = cancelledProduct.product ? cancelledProduct.product.productName : 'Unknown Product';
    const price = isNaN(cancelledProduct.product?.price) ? 0 : cancelledProduct.product.price;
    const tax = isNaN(cancelledProduct.product?.tax) ? 0 : cancelledProduct.product.tax;
    const cancelledAmount = (cancelledProduct.quantity * price) + tax;

    // Log the product details and calculated amounts
    console.log('Product Name:', productName);
    console.log('Cancelled Amount:', cancelledAmount);
    console.log('Cancelled Price:', price);

    // Log the totals before the update
    console.log('Before Update Totals:', order.totals);

    // Update the product quantity
    const updatedProductQuantity = cancelledProduct.product.quantity + cancelledProduct.quantity;

    // Update the order in the database using $pull and $inc
    const result = await orderModels.updateOne(
      { orderID: orderId },
      {
        $pull: { products: { _id: cancelledProduct._id } },
        $inc: {
          'totals.subtotal': -price * cancelledProduct.quantity,
          'totals.tax': -tax * cancelledProduct.quantity,
          'totals.shipping': 0, // Adjust this based on your logic for shipping
          'totals.grandTotal': -cancelledAmount,
        },
      }
    );

    // Update the product quantity in the database
    await Product.updateOne(
      { _id: productId },
      { $set: { quantity: updatedProductQuantity } }
    );

    // Log the totals after the update
    console.log('After Update Totals:', result);

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

const downloadInvoice = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    console.log(orderId);

    // Fetch order details from the database
    const orderDetails = await orderModels.findOne({ orderID: orderId })
    .populate({
      path: 'products.product', // Assuming 'product' field in 'products' array references the Product model
      select: 'name price', // Specify the fields you want to populate
    })
    .exec();

    // Check if the order exists
    if (!orderDetails) {
      console.log('Order not found');
      return res.status(404).send('Order not found');
    }

    console.log('Order Details:', orderDetails);

    // Read the EJS template from the file
    const templatePath = 'views/orders/invoice.ejs';
    const templateContent = fs.readFileSync(templatePath, 'utf-8');

    // Render the EJS template
    const renderedHTML = ejs.render(templateContent, { orderDetails,user:req.session.user });

    // Generate PDF from HTML
    const pdfOptions = { format: 'Letter' }; // You can adjust the format as needed
    pdf.create(renderedHTML, pdfOptions).toStream((err, stream) => {
      if (err) {
        console.error('Error generating PDF:', err);
        res.status(500).send('Internal server error');
        return;
      }

      const currentDate = new Date();
    const formattedDate = currentDate.toISOString().slice(0, 10);

      // Set response headers for file download
      res.setHeader('Content-Disposition', `attachment; filename=invoice_${formattedDate}.pdf`);
      res.setHeader('Content-Type', 'application/pdf');

      // Stream the PDF directly to the response object
      stream.pipe(res);
    });

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
    downloadInvoice
  
 }  