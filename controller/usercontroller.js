const User = require("../models/userModel");
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const bcrypt = require("bcrypt");
const cartItemCountMiddleware = require("../middlewares/cartCountMiddleware");
const Reminder = require("../models/reminderModel");
const RateUs = require("../models/RateusModel");
const cron = require("node-cron");
const twilio = require("twilio");
require("dotenv").config();
//user home------------------------------------------------------->
const home = async (req, res) => {
  try {
    const user = req.session.user;

    // Fetch products with either Offerprice or productOfferprice
    const productsWithOffer = await Product.find({
      $or: [
        { Offerprice: { $ne: null } },
        { productOfferprice: { $ne: null } },
      ],
    }).exec();
    console.log("offer price", productsWithOffer);

    const Rateus = await RateUs.find({ rating: { $gt: 4 } })
      .limit(4)
      .populate("userId")
      .exec();

    res.render("./user/userhome", {
      pageTitle: "userhome",
      user,
      products: productsWithOffer,
      Rateus,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

//coffee mix------------------------------------------------------->
const coffeemix = (req, res) => {
  const user = req.session.user;
  res.render("./user/coffeemix", { pageTitle: "coffeemix", user });
};
//coffee reminder------------------------------------------------------->
const reminder = (req, res) => {
  const user = req.session.user;
  const errorMessage = req.flash("error")[0];
  const successMessage = req.flash("success")[0];
  res.render("./user/reminder", {
    pageTitle: "reminder",
    user,
    successMessage,
    errorMessage,
  });
};
//user signup------------------------------------------------------->
const signup = (req, res) => {
  res.render("./user/signup", { error: req.flash("error") });
};
//user login------------------------------------------------------->
const login = (req, res) => {
  const email = req.session.email;
  console.log(email);
  res.render("./user/login", { error1: req.flash("error1")[0] || "" });
};
//checking the user valid or invalid------------------------------------------------------->
const login1 = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      req.flash("error1", "Invalid email or password");
      return res.render("./user/login", { error1: req.flash("error1") });
    }
    if (user.status === "blocked") {
      req.flash("error1", "User is blocked. Cannot log in.");
      return res.render("./user/login", { error1: req.flash("error1") });
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (passwordMatch) {
      req.session.logged = true;
      req.session.user = {
        name: user.name,
        email: user.email,
        _id: user._id,
        referralCode: user.referralCode,
      };
      await cartItemCountMiddleware(req, res, () => {});
      res.redirect("/");
    } else {
      req.flash("error1", "Invalid email or password");
      return res.render("./user/login", { error1: req.flash("error1") });
    }
  } catch (error) {
    console.error(error);
    req.flash("error", "Internal Server Error");
    return res.status(500).render("error", { error1: req.flash("error") });
  }
};
//user products------------------------------------------------------->
const product = async (req, res) => {
  try {
    const user = req.session.user;
    const categoryId = req.query.categoryId;
    const currentPage = parseInt(req.query.page) || 1;
    const itemsPerPage = 8;
    const searchQuery = req.query.search || "";
    console.log(searchQuery);
    let query = {};
    if (searchQuery) {
      query = {
        $or: [
          { name: { $regex: searchQuery, $options: "i" } },
          { description: { $regex: searchQuery, $options: "i" } },
          { ingredients: { $regex: searchQuery, $options: "i" } },
          !isNaN(searchQuery) && { price: searchQuery },
          { "category.name": { $regex: searchQuery, $options: "i" } },
        ].filter(Boolean),
      };
    }
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / itemsPerPage);
    if (currentPage < 1 || currentPage > totalPages) {
      return res.status(404).render("error404");
    }
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const products = await Product.find(query)
      .populate("category")
      .skip(startIndex)
      .limit(itemsPerPage);
    const categories = await Category.find();
    const cartItemCount = req.session.cartItemCount;
    res.render("./user/products", {
      title: "Products",
      products,
      categories,
      cartItemCount,
      user,
      currentPage,
      totalPages,
      categoryId,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).render("error500");
  }
};
//user main product page------------------------------------------------------->
const mainproduct = async (req, res) => {
  try {
    const productId = req.params.productId;
    const product = await Product.findById(productId).populate("category");
    if (!product) {
      console.log("Product not found");
      return res.render("./user/mainproduct", { title: "Product Not Found" });
    }
    const user = req.session.user;
    cartItemCount = req.session.cartItemCount;
    res.render("./user/mainproduct", {
      title: "Products",
      product,
      user,
      cartItemCount,
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).send("Internal Server Error");
  }
};
//user getting product by category------------------------------------------------------->
const getProductsByCategory = async (req, res) => {
  try {
    const user = req.session.user;
    const categoryId = req.query.category;
    const currentPage = parseInt(req.query.page) || 1;
    const itemsPerPage = 8;

    const totalProducts = await Product.countDocuments({
      category: categoryId,
    });
    const totalPages = Math.ceil(totalProducts / itemsPerPage);
    if (currentPage < 1 || currentPage > totalPages) {
      return res.status(404).render("error404");
    }
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const products = await Product.find({ category: categoryId })
      .populate("category")
      .skip(startIndex)
      .limit(itemsPerPage);
    console.log(products.length);
    const categories = await Category.find();
    const cartItemCount = req.session.cartItemCount;
    res.render("./user/products", {
      title: "Products",
      products,
      categories,
      cartItemCount,
      user,
      currentPage,
      totalPages,
      categoryId,
    });
  } catch (error) {
    console.error("Error fetching products by category:", error);
    res.status(500).render("error500");
  }
};
//setreminder------------------------------------------------------->
const setreminder = async (req, res) => {
  try {
    if (!req.session.user || !req.session.user._id) {
      req.flash("error", "User not authenticated");
      return res.redirect("/set-reminder");
    }
    const userId = req.session.user._id;
    const { coffeeTime, phoneNumber } = req.body;
    const reminder = new Reminder({
      userId,
      coffeeTime,
      phoneNumber,
    });
    await reminder.save();
    req.flash("success", "Reminder set successfully!");
    return res.redirect("/reminder");
  } catch (error) {
    console.error("Error setting reminder:", error.message);
    req.flash("error", "Oops! Something went wrong. Please try again later.");
    return res.redirect("/reminder");
  }
};

//user forgot password------------------------------------------------------->
const forgot = (req, res) => {
  res.render("./user/forgot");
};
//user logout------------------------------------------------------->
const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      res.redirect("/login");
    } else {
      const logoutMessage = "Successfully logged out.";
      res.redirect(
        "/login?logoutMessage=" + encodeURIComponent(logoutMessage)
      );
    }
  });
};
//schedule the coffee time------------------------------------------------------->
const accountSid = process.env.accountSid;
const authToken = process.env.authToken;
const twilioPhoneNumber = process.env.twilioPhoneNumber;
const client = new twilio(accountSid, authToken, {
  from: twilioPhoneNumber,
});
const sendSMS = async (to, message) => {
  try {
    const result = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to,
    });

    console.log("SMS sent successfully. SID:", result.sid);
  } catch (error) {
    console.error("Error sending SMS:", error.message);
  }
};
cron.schedule("* * * * *", async () => {
  try {
    const currentHour = new Date().getHours();
    const currentMinute = new Date().getMinutes();
    const reminders = await Reminder.find();
    for (const reminder of reminders) {
      const { userId, coffeeTime, phoneNumber } = reminder;
      const [hour, minute] = coffeeTime.split(":");
      if (
        parseInt(hour) === currentHour &&
        parseInt(minute) === currentMinute
      ) {
        try {
          const user = await User.findById(userId);
          if (user) {
            const userName = user.name;
            const message = `Hey ${userName}, don't forget your coffee time at ${coffeeTime} ☕️ from COFFEE LAND`;
            await sendSMS(phoneNumber, message);
          } else {
            console.error(`User with ID ${userId} not found.`);
          }
        } catch (error) {
          console.error("Error fetching user information:", error.message);
        }
      }
    }
  } catch (error) {
    console.error("Error processing reminders:", error.message);
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
  setreminder,
};
