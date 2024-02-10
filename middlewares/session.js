const User = require("../models/userModel");
const verifyUser = (req, res, next) => {
  if (req.session.logged) {
    next();
  } else {
    res.redirect("/login");
  }
};

const userExist = (req, res, next) => {
  if (req.session.logged) {
    res.redirect("/");
  } else {
    next();
  }
};

const verifyAdmin = (req, res, next) => {
  if (req.session.adLogged) {
    next();
  } else {
    res.redirect("/admin/login");
  }
};

const adminExist = (req, res, next) => {
  if (req.session.adLogged) {
    res.redirect("/adhome");
  } else {
    next();
  }
};

const checkUserStatus = async (req, res, next) => {
  if (req.isAuthenticated()) {
    try {
      const user = await User.findById(req.user._id);
      console.log("user", user);
      if (user && user.status === "blocked") {
        req.logout(); // Log out the user
      }
    } catch (error) {
      console.error(error);
    }
  }
  next();
};

module.exports = {
  verifyUser,
  userExist,
  adminExist,
  verifyAdmin,
  checkUserStatus,
};
