const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises').unlink;
const FS = require('fs');
//Product list in admin side------------------------------------------------------->
const productList = async (req, res) => {
    const itemsPerPage = 3; // pagination
    const page = parseInt(req.query.page) || 1;
    try {
        const totalProducts = await Product.countDocuments();
        const totalPages = Math.ceil(totalProducts / itemsPerPage);
        const products = await Product.find().sort({ _id: -1 }).populate('category')
            .skip((page - 1) * itemsPerPage)
            .limit(itemsPerPage);
        res.render('./product/products', {
            title: 'Products',
            products,
            totalPages,
            currentPage: page,
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).send('Internal Server Error');
    }
};
//add product with categories that stored in database------------------------------------------------------->
const addform = function(req, res) {
    Category.find({}).exec()
        .then(categories => {
            res.render('./product/addproduct', { categories });
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Internal Server Error');
        });
};
//add product in admin side------------------------------------------------------->
const addproduct = function(req, res) {
    const { name, description, category, price, ingredients, quantity } = req.body;
    let image;
    if (req.file) {
        image = req.file.filename;
    }
    const newProduct = new Product({
        name,
        description,
        category,
        image,
        price,
        ingredients,
        quantity, // Add the quantity here
    });
    newProduct.save()
        .then(() => {
            res.redirect('/product');
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Internal Server Error');
        });
};
//fetching product id and category id to edit product------------------------------------------------------->
const editform = function(req, res) {
    const productId = req.params.id;
    Promise.all([
        Product.findById(productId),
        Category.find({})
    ])
    .then(([product, categories]) => {
        res.render('./product/editproduct', { product, categories });
    })
    .catch(err => {
        console.error(err);
        res.status(500).send('Internal Server Error');
    });
};
//updateproduct in the admin side------------------------------------------------------->
const updateproduct = async function (req, res) {
    console.log('File:', req.file);
    console.log('Content-Type:', req.headers['content-type']);
    const productId = req.params.id;
    const { name, description, category, price, ingredients, quantity, deleteExistingImage } = req.body;
    try {
        const currentProduct = await Product.findById(productId);
        console.log('Current Product:', currentProduct);
        if (!currentProduct) {
            return res.status(404).send('Product not found');
        }
        if (deleteExistingImage === 'on' && currentProduct.image) {
            const imagePath = path.join(__dirname, '../public/assets/product-images', currentProduct.image);
            try {
                await FS.promises.unlink(imagePath);
                console.log('Old Image Deleted Successfully');
                currentProduct.image = undefined;
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    console.error('Error deleting image file:', error.message);
                    return res.status(500).send('Error deleting image file');
                }
                console.log('File not found:', imagePath);
            }
        }
        if (req.file) {
            const existingFilename = currentProduct.image ? path.basename(currentProduct.image) : undefined;
            currentProduct.image = req.file ? req.file.filename : currentProduct.image;
        }
        currentProduct.name = name;
        currentProduct.description = description;
        currentProduct.category = category;
        currentProduct.price = price;
        currentProduct.ingredients = ingredients;
        currentProduct.quantity = quantity; // Add this line to update quantity
        await currentProduct.save();
        console.log('Updated Product:', currentProduct);
        res.redirect('/product');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
};

//delete product in admin side------------------------------------------------------->
const deleteproduct = async function(req, res) {
    const productId = req.params.id;
    try {
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).send('Product not found');
        }
        if (product.image) {
            const imagePath = path.join(__dirname, '../public/assets/product-images', product.image);
            try {
                await FS.promises.unlink(imagePath);
                console.log('Image Deleted Successfully');
            } catch (error) {
                console.error('Error deleting image file:', error.message);
            }
        }
        await Product.findByIdAndDelete(productId);
        res.redirect('/product');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
};
//modules exports------------------------------------------------------->
module.exports = {
    productList,
    addform,
    addproduct,
    editform,
    updateproduct,
    deleteproduct,
    
};
