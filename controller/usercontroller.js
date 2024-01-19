const User = require('../models/userModel');
const Product=require('../models/productModel')
const Category=require('../models/categoryModel')
const bcrypt = require('bcrypt');
const cartItemCountMiddleware = require('../middlewares/cartCountMiddleware');


//user home------------------------------------------------------->
const home = async (req, res) => {
    try {
        const user = req.session.user;
        const products = await Product.find().exec();

        res.render("./user/userhome", { pageTitle: "userhome", user, products });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
const coffeemix = (req, res) => {
    const user = req.session.user;
    
    res.render("./user/coffeemix", { pageTitle: "coffeemix",user});
}
//user signup------------------------------------------------------->
const signup=(req, res) => {
    res.render('./user/signup', { error: req.flash('error') });
  };
//user login------------------------------------------------------->  
const login = (req, res) => {
    const email=req.session.email
    console.log(email);
    res.render("./user/login", { error1: req.flash('error1')[0] || '' });
}
;
//checking the user valid or invalid------------------------------------------------------->
const login1 = async (req, res) => {
    const { email, password } = req.body;
    console.log({email,password});
    try {
        const user = await User.findOne({ email });
        if (!user) {
            req.flash('error1', 'Invalid email or password');
            return res.render('./user/login', { error1: req.flash('error1') });
        }
        if (user.status === 'blocked') {
            req.flash('error1', 'User is blocked. Cannot log in.');
            return res.render('./user/login', { error1: req.flash('error1') });
        }
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (passwordMatch) {
           
            req.session.logged = true;
req.session.user = {
    name: user.name,
    email: user.email,
    _id: user._id,
    referralCode:user.referralCode
};
await cartItemCountMiddleware(req, res, () => {});
const products = await Product.find().exec();
            return res.render('./user/userhome', { user ,products});
        } else {
            req.flash('error1', 'Invalid email or password');
            return res.render('./user/login', { error1: req.flash('error1') });
        }
    } catch (error) {
        console.error(error);
        req.flash('error', 'Internal Server Error');
        return res.status(500).render('error', { error1: req.flash('error') });
    }
};
//user products------------------------------------------------------->
const product = async (req, res) => {
    try {
        const user = req.session.user;
        const currentPage = parseInt(req.query.page) || 1;
        const itemsPerPage = 8;

        const totalProducts = await Product.countDocuments();
        const totalPages = Math.ceil(totalProducts / itemsPerPage);

        if (currentPage < 1 || currentPage > totalPages) {
            return res.status(404).render('error404'); // Handle invalid page numbers
        }

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;

        const products = await Product.find().populate('category').skip(startIndex).limit(itemsPerPage);
        const categories = await Category.find(); 
        const cartItemCount = req.session.cartItemCount;

        res.render('./user/products', {
            title: 'Products',
            products,
            categories,
            cartItemCount,
            user,
            currentPage,
            totalPages
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).render('error500'); // Handle server error
    }
};
//user main product page------------------------------------------------------->
const mainproduct = async (req, res) => {
    try {
        const productId = req.params.productId; 
        const product = await Product.findById(productId).populate('category');
        if (!product) {
            console.log("Product not found");
            return res.render('./user/mainproduct', { title: 'Product Not Found' });
        }
        const user = req.session.user;
        cartItemCount=req.session.cartItemCount
        res.render('./user/mainproduct', { title: 'Products', product,user,cartItemCount});
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).send('Internal Server Error');
    }
}
//user getting product by category------------------------------------------------------->
const getProductsByCategory = async (req, res) => {
    try {
        const user = req.session.user;
        const categoryId = req.query.category;
        const currentPage = parseInt(req.query.page) || 1;
        const itemsPerPage = 8;

        const totalProducts = await Product.countDocuments({ category: categoryId });
        const totalPages = Math.ceil(totalProducts / itemsPerPage);
        if (currentPage < 1 || currentPage > totalPages) {
            return res.status(404).render('error404'); 
        }
        const startIndex = (currentPage - 1) * itemsPerPage;
const endIndex = startIndex + itemsPerPage;
        const products = await Product.find({ category: categoryId })
            .populate('category')
            .skip(startIndex)
            .limit(itemsPerPage);
            console.log(products.length);
        const categories = await Category.find();
        const cartItemCount = req.session.cartItemCount;
        res.render('./user/products', {
            title: 'Products',
            products,
            categories,
            cartItemCount,
            user,
            currentPage,
            totalPages,
        });
    } catch (error) {
        console.error('Error fetching products by category:', error);
        res.status(500).render('error500'); // Handle server error
    }
};
//user forgot password------------------------------------------------------->
const forgot=(req, res) => {
    res.render('./user/forgot');
  };
//user logout------------------------------------------------------->
const logout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            res.redirect('/user/login'); 
        } else {
            const logoutMessage = 'Successfully logged out.';
            res.redirect('/user/login?logoutMessage=' + encodeURIComponent(logoutMessage));
        }
    });
};
//module exports------------------------------------------------------->
module.exports = {
    home,
    signup,
    login,
    login1,
    product,
    mainproduct,
    getProductsByCategory,
    forgot,
    logout,
    coffeemix,
};
