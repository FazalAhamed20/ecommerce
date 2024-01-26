const User = require('../models/userModel');
const Address = require('../models/addressModel');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const Coupon=require('../models/couponModel')
//user profile------------------------------------------------------->
const userprofile = (req, res) => { 
    const user = req.session.user || {};
    res.render('./userprofile/profile.ejs', { pageTitle: 'userprofile', user });
};
//main profile------------------------------------------------------->
const usermain = (req, res) => {
    const user = req.session.user;
    console.log(user);
    res.render('./userprofile/userprofile.ejs', { pageTitle: 'userprofile', user, successMessage: '', errorMessage: '' });
};
//user address------------------------------------------------------->
const address = async (req, res) => {
    try {
        if (req.session.user) {
            const userId = req.session.user._id; 
            const user = await User.findById(userId);
            console.log(user);
            if (!user) {
                return res.status(404).send('User not found');
            }
            const addresses = await Address.find({ userId: user._id });
            res.render('userprofile/address', { addresses, user });
        } else {
            return res.redirect('/user/login');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};
//user add address------------------------------------------------------->
const addaddress = (req, res) => {
    const user = req.session.user || {};
    res.render('./userprofile/addaddress.ejs', { pageTitle: 'addaddress', user });
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
                return res.status(404).send('User not found');
            }

            const { name, mobile, email, pincode, houseName, locality, city, district, state } = req.body;
            const newAddress = new Address({
                userId: user._id,
                name,
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

            // Update the session with the user object
            req.session.user = user;

            return res.redirect('/user/address');
        } else {
            return res.status(401).send('Unauthorized');
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
};
//edit address form------------------------------------------------------->
const editaddressform = async (req, res) => {
    try {
      const addressId = req.params.id;
      const address = await Address.findById(addressId);
      if (!address) {
        return res.status(404).send('Address not found');
      }
      if (req.method === 'POST') {
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
        return res.redirect('/user/address');
      }
      res.render('userprofile/editaddress', { address });
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  };
  //delete address------------------------------------------------------->
  const deleteAddress = async (req, res) => {
    try {
      const addressId = req.params.id;
      await Address.findByIdAndDelete(addressId);
      const userId = req.session.user._id;
      await User.findByIdAndUpdate(userId, { $pull: { addresses: addressId } });
      res.redirect('/user/address');
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
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
                    const successMessage = 'Successfully updated';
                    
                    res.render('./userprofile/userprofile', { successMessage, user });
                
                } else {
                    console.log('Authentication failed');
                    res.render('./userprofile/userprofile', { errorMessage: 'Invalid password', user });
                }
            });
        } else {
            res.render('./userprofile/userprofile', { errorMessage: 'User not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
};

const rewards = async (req, res) => {
    try {
        const user = req.session.user || {};

        // Fetch all coupons from the Coupon model
        const coupons = await Coupon.find();

        const formattedCoupons = coupons.map((coupon) => ({
            ...coupon._doc,
            startDate: coupon.startDate.toLocaleDateString('en-IN'),
            expiryDate: coupon.expiryDate.toLocaleDateString('en-IN'),
          }));

        res.render('./userprofile/reward.ejs', { pageTitle: 'Rewards', user, coupons:formattedCoupons });
    } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).send('Internal Server Error');
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
    rewards
};
