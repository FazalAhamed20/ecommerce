// models/Product.js
const mongoose = require('mongoose');
const Category = require('./categoryModel');
 // Import the Category model

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        
    },
   
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: Category,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    ingredients: {
        type: String,
        required: false,
    },
    quantity: {
        type: Number,
        default: 0, // You can set a default value if needed
    },
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
