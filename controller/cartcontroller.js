const cartModels = require('../models/cartModel');
const mongoose = require('mongoose');
const Product = require('../models/productModel');
//calculate totals------------------------------------------------------->
const calculateTotals = (cartItems) => {
  const totals = cartItems.reduce(
    (accumulator, item) => {
      let productPrice = 0;
      if (item.productId && typeof item.productId === 'object') {
        productPrice = item.productId.price || 0;
      } else {
        console.warn(`Invalid product data for item: ${JSON.stringify(item)}`);
      }
      const itemSubtotal = productPrice * item.quantity;
      accumulator.subtotal += itemSubtotal;
      return accumulator;
    },
    {
      subtotal: 0,
    }
  );
//update totalst------------------------------------------------------->
  const updatedTotals = {
    subtotal: totals.subtotal,
    tax: totals.subtotal * 0.05,
    shipping: 15.00,
    grandTotal: totals.subtotal + totals.subtotal * 0.05 + 15.00,
  };
  return updatedTotals;
};
//user cart------------------------------------------------------->
const usercart = async (req, res) => {
  try {
    const user = req.session.user || {};
    const cart = await cartModels.findOne({ userId: user._id }).populate('products.productId', 'name price description image quantity');
    if (!cart) {
      const newCart = new cartModels({ userId: user._id, products: [], totals: { subtotal: 0, tax: 0, shipping: 0, grandTotal: 0 } });
      await newCart.save();
      return res.redirect('/user/cart');
    }
    const cartItems = cart.products || [];
    const cartItemCount = cartItems.length;
    const totals = calculateTotals(cartItems);
        cart.totals.subtotal = totals.subtotal;
        cart.totals.tax = totals.tax;
        cart.totals.shipping = totals.shipping;
        cart.totals.grandTotal = totals.grandTotal;
     await cart.save();
    console.log('Product Names and Images:');
    cartItems.forEach(item => {
      if (item.productId) {
        if (Array.isArray(item.productId)) {
          item.productId.forEach(product => {
            if (product && product._id) {
              console.log('Product ID:', product._id);
              console.log('Product Name:', product.name || 'Product Name not available');
              console.log('Product Image:', product.image || 'No image available');
              console.log(product.quantity);
            } else {
              console.log('Product ID not available');
            }
          });
        } else {
          console.log('Product ID:', item.productId._id);
          console.log('Product Name:', item.productId.name || 'Product Name not available');
          console.log('Product Image:', item.productId.image || 'No image available');
          console.log('Product quantity:',item.productId.quantity);
        }
      } else {
        console.log('Product ID not available');
      }
    });
    res.render('./cart/cart.ejs', { pageTitle: 'usercart', user, cartItems, cartItemCount, totals, messages: req.flash() });
  } catch (error) {
    console.error('Error fetching cart items:', error);
    res.status(500).send('Internal Server Error');
  }
};
//add to cart------------------------------------------------------->
const addToCart = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const productId = req.params.productId;

    const product = await Product.findById(productId);
    if (!product || product.quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Product not available for purchase.' });
    }

    let cart = await cartModels.findOne({ userId });
    if (!cart) {
      cart = new cartModels({ userId, products: [] });
    }

    const existingProduct = cart.products.find(product => product.productId && product.productId.toString() === productId);
    if (existingProduct) {
      // Check if decrementing will make the quantity negative
      if (product.quantity - 1 < 0) {
        return res.status(400).json({ success: false, message: 'Product out of stock.' });
      }

      existingProduct.quantity++;

      // Decrement the quantity in the database
      product.quantity--;
      await product.save();
    } else {
      // Check if decrementing will make the quantity negative
      if (product.quantity - 1 < 0) {
        return res.status(400).json({ success: false, message: 'Product out of stock.' });
      }

      cart.products.push({ productId, quantity: 1 });

      // Decrement the quantity in the database
      product.quantity--;
      await product.save();
    }

    await cart.save();
   
  } catch (error) {
    console.error('Error adding product to cart:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};



//remove from the cart------------------------------------------------------->
const removeFromCart = async (req, res) => {
  const userId = req.session.user._id; 
  const productId = req.params.productId;
  try {
    const cart = await cartModels.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }
    cart.products = cart.products.filter(
      (item) => item.productId && item.productId.toString() !== productId.toString()
    );
    await cart.save();
    const updatedCart = await cartModels.findOne({ userId });
    const cartItemCount = updatedCart ? updatedCart.products.length : 0;
    res.redirect('/user/cart');
  } catch (error) {
    console.error('Error removing product from cart:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
//update quantity------------------------------------------------------->
const updatequantity = async (req, res) => {
  try {
    const productId = req.params.productId;
    const quantity = parseInt(req.params.quantity);
    console.log(quantity);
    const userId = req.session.user._id;

    if (!productId || productId === "null") {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    let userCart = await cartModels.findOne({ userId });
    if (!userCart) {
      userCart = new cartModels({ userId, products: [] });
    }

    const cartItemIndex = userCart.products.findIndex(product => product.productId && product.productId.toString() === productId);
    if (cartItemIndex !== -1) {
      // Check if updating will make the quantity negative
      if (quantity < 0) {
        return res.status(400).json({ success: false, message: 'Invalid quantity' });
      }

      // Update the quantity in the cart
      const oldQuantity = userCart.products[cartItemIndex].quantity;
      userCart.products[cartItemIndex].quantity = quantity;

      // Update the quantity in the database
      const updatedQuantity = product.quantity + oldQuantity - quantity;
      product.quantity = updatedQuantity;
      console.log(product.quantity)
      if(product.quantity<0){
        console.log(product.quantity);
        console.log("out of stock");
       return res.send('out of stocks')
      }
      await product.save();
    } else {
      return res.status(400).json({ success: false, message: 'Product not found in the cart' });
    }

    await userCart.save();
    res.redirect('/user/cart');
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

//modules------------------------------------------------------->
module.exports = {
  usercart,
  addToCart,
  removeFromCart,
  updatequantity,
  
 
};
