const User = require("../models/userModel");
const Address = require("../models/addressModel");
const bcrypt = require("bcrypt");
const Wallet = require("../models/walletModel");
const Coupon = require("../models/couponModel");
const RateUs = require("../models/RateusModel");
//user profile------------------------------------------------------->
const userprofile = (req, res) => {
  const user = req.session.user || {};
  res.render("./userprofile/profile.ejs", { pageTitle: "userprofile", user });
};
//main profile------------------------------------------------------->
const usermain = async (req, res) => {
  try {
    const userId = req.session.user._id;

    // Fetch the wallet associated with the user from the database
    const wallet = await Wallet.findOne({ user: userId }).exec();

    const walletBalance = wallet ? wallet.balance : 0;

    console.log(walletBalance);

    res.render("./userprofile/userprofile.ejs", {
      pageTitle: "userprofile",
      user: req.session.user,
      walletBalance,
      successMessage: "",
      errorMessage: "",
    });
  } catch (error) {
    console.error("Error fetching user wallet data:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
//user address------------------------------------------------------->
const address = async (req, res) => {
  try {
    if (req.session.user) {
      const userId = req.session.user._id;
      const user = await User.findById(userId);
      console.log(user);
      if (!user) {
        return res.status(404).send("User not found");
      }
      const addresses = await Address.find({ userId: user._id });
      res.render("userprofile/address", { addresses, user });
    } else {
      return res.redirect("/login");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};
//user add address------------------------------------------------------->
const addaddress = (req, res) => {
  const user = req.session.user || {};
  res.render("./userprofile/addaddress.ejs", { pageTitle: "addaddress", user });
};
//adding address form------------------------------------------------------->
const addaddressform = async (req, res) => {
  try {
    if (req.session.user) {
      const userId = req.session.user._id;
      console.log("userid", userId);
      const user = await User.findById(userId);
      console.log("user n", user);
      if (!user) {
        return res.status(404).send("User not found");
      }

      const {
        mobile,
        email,
        pincode,
        houseName,
        locality,
        city,
        district,
        state,
      } = req.body;
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
      return res.redirect("/address");
    } else {
      return res.status(401).send("Unauthorized");
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
};
//edit address form------------------------------------------------------->
const editaddressform = async (req, res) => {
  try {
    const addressId = req.params.id;
    const address = await Address.findById(addressId);
    if (!address) {
      return res.status(404).send("Address not found");
    }
    if (req.method === "POST") {
      address.name = req.body.name;
      address.mobile = req.body.mobile;
      address.email = req.body.email;
      address.pincode = req.body.pincode;
      address.houseName = req.body.houseName;
      address.locality = req.body.locality;
      address.city = req.body.city;
      address.district = req.body.district;
      address.state = req.body.state;
      await address.save();
      return res.redirect("/address");
    }
    res.render("userprofile/editaddress", { address });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};
//delete address------------------------------------------------------->
const deleteAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    await Address.findByIdAndDelete(addressId);
    const userId = req.session.user._id;
    await User.findByIdAndUpdate(userId, { $pull: { addresses: addressId } });
    res.redirect("/address");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};
//edit user------------------------------------------------------->
const edituser = async (req, res) => {
  try {
    const { name, email, currentPassword } = req.body;
    const email1 = req.body.email;
    const inputPassword = req.body.currentPassword;
    const user = await User.findOne({ email: email1 });
    if (user) {
      bcrypt.compare(inputPassword, user.password, async (err, result) => {
        if (result) {
          const user_id = user._id;
          const updatedUser = await User.findByIdAndUpdate(
            user_id,
            { name, email },
            { new: true }
          );
          req.session.user = updatedUser;
          const successMessage = "Successfully updated";
          res.render("./userprofile/userprofile", { successMessage, user });
        } else {
          console.log("Authentication failed");
          res.render("./userprofile/userprofile", {
            errorMessage: "Invalid password",
            user,
          });
        }
      });
    } else {
      res.render("./userprofile/userprofile", {
        errorMessage: "User not found",
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};
//rewards------------------------------------------------------->
const rewards = async (req, res) => {
  try {
    const user = req.session.user || {};
    const coupons = await Coupon.find();
    const formattedCoupons = coupons.map((coupon) => ({
      ...coupon._doc,
      startDate: coupon.startDate.toLocaleDateString("en-IN"),
      expiryDate: coupon.expiryDate.toLocaleDateString("en-IN"),
    }));

    res.render("./userprofile/reward.ejs", {
      pageTitle: "Rewards",
      user,
      coupons: formattedCoupons,
    });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    res.status(500).send("Internal Server Error");
  }
};
//rateus------------------------------------------------------->
const rateus = (req, res) => {
  const user = req.session.user || {};
  const errorMessage5 = req.flash("error")[0];
  const successMessage5 = req.flash("success")[0];
  res.render("./userprofile/rateus.ejs", {
    pageTitle: "Rate Us",
    errorMessage5,
    successMessage5,
    user
  });
};
const hasUserRated = async (userId) => {
  const existingRating = await RateUs.findOne({ userId });
  return !!existingRating;
};
const submitRating = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const userHasRated = await hasUserRated(userId);

    if (userHasRated) {
      req.flash("error", "you have already rated.");
      return res.redirect("/rateus");
    }
    const newRating = new RateUs({
      userId,
      rating: parseInt(req.body.rating),
      feedback: req.body.feedback,
    });
    await newRating.save();
    req.flash("success", "Thanks for rating!");
    res.redirect("/rateus");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};
//modules------------------------------------------------------->
module.exports = {
  userprofile,
  usermain,
  edituser,
  address,
  addaddress,
  addaddressform,
  editaddressform,
  deleteAddress,
  rewards,
  rateus,
  submitRating,
};
