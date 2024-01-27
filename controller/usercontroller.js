const User = require('../models/userModel');
const Product=require('../models/productModel')
const Category=require('../models/categoryModel')
const bcrypt = require('bcrypt');
const cartItemCountMiddleware = require('../middlewares/cartCountMiddleware');
const Reminder=require('../models/reminderModel')
const mongoose=require('mongoose')
const cron = require('node-cron');
const twilio = require('twilio');


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
const reminder = (req, res) => {
    const user = req.session.user;
    const errorMessage = req.flash('error')[0];
  const successMessage = req.flash('success')[0];
    
    res.render("./user/reminder", { pageTitle: "reminder",user,successMessage,errorMessage});
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
        const categoryId = req.query.categoryId;
        const currentPage = parseInt(req.query.page) || 1;
        const itemsPerPage = 8;
        const searchQuery = req.query.search || ''; 
        console.log(searchQuery);
        let query = {};
if (searchQuery) {
    query = {
        $or: [
            { name: { $regex: searchQuery, $options: 'i' } },
            { description: { $regex: searchQuery, $options: 'i' } },
            { ingredients: { $regex: searchQuery, $options: 'i' } },
            !isNaN(searchQuery) && { price: searchQuery },
            { 'category.name': { $regex: searchQuery, $options: 'i' } },
        ].filter(Boolean),
    };
}
        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / itemsPerPage);

        if (currentPage < 1 || currentPage > totalPages) {
            return res.status(404).render('error404'); // Handle invalid page numbers
        }

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;

        const products = await Product.find(query).populate('category').skip(startIndex).limit(itemsPerPage);
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
            categoryId
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
            categoryId
        });
    } catch (error) {
        console.error('Error fetching products by category:', error);
        res.status(500).render('error500'); // Handle server error
    }
};

const setreminder = async (req, res) => {
    try {
        
        if (!req.session.user || !req.session.user._id) {
            req.flash('error', 'User not authenticated');
            return res.redirect('/set-reminder');
        }

        const userId = req.session.user._id;
        console.log(userId);

        const { coffeeTime, phoneNumber } = req.body;
        console.log({ coffeeTime, phoneNumber });

        const reminder = new Reminder({
            userId,
            coffeeTime,
            phoneNumber,
        });

        await reminder.save();

        req.flash('success', 'Reminder set successfully!');
        return res.redirect('/user/reminder');
    } catch (error) {
        console.error('Error setting reminder:', error.message);
        req.flash('error', 'Oops! Something went wrong. Please try again later.');
        return res.redirect('/user/reminder');
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

const accountSid = 'ACef64d351381c5844984f101ad1c102b5';
const authToken = '17258729111dec2e32ee189f5ee92021';
const twilioPhoneNumber = '+15168064670';

const client = new twilio(accountSid, authToken);

const sendSMS = async (to, message) => {
    try {
        const result = await client.messages.create({
            body: message,
            from: twilioPhoneNumber,
            to,
        });

        console.log('SMS sent successfully. SID:', result.sid);
    } catch (error) {
        console.error('Error sending SMS:', error.message);
    }
};

// Schedule SMS sending using node-cron based on coffeeTime
cron.schedule('* * * * *', async () => {
    try {
        const currentHour = new Date().getHours();
        const currentMinute = new Date().getMinutes();

        const reminders = await Reminder.find();

        reminders.forEach(async (reminder) => {
            const { userId, coffeeTime, phoneNumber } = reminder;
            const [hour, minute] = coffeeTime.split(':');

            // Schedule SMS only if the current time matches coffeeTime
            if (parseInt(hour) === currentHour && parseInt(minute) === currentMinute) {
                try {
                    // Fetch the user information from the database
                    const user = await User.findById(userId);

                    if (user) {
                        const userName = user.name;
                        const message = `Hey ${userName}, don't forget your coffee time at ${coffeeTime} ☕️ from COFFEE LAND`;

                        // Send SMS with the user's name
                        await sendSMS(phoneNumber, message);
                    } else {
                        console.error(`User with ID ${userId} not found.`);
                    }
                } catch (error) {
                    console.error('Error fetching user information:', error.message);
                }
            }
        });
    } catch (error) {
        console.error('Error processing reminders:', error.message);
    }
});

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
    reminder,
    setreminder
};
