const nodemailer = require("nodemailer");
const User=require('../models/userModel')
const bcrypt = require('bcrypt');


function generateReferralCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let referralCode = '';
    for (let i = 0; i < 6; i++) {
        referralCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return referralCode;
}
//Transporter for the mail(nodemailer)------------------------------------------------------->
let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    service: 'Gmail',
    auth: {
        user: 'fazalahamed628@gmail.com',
        pass: 'ywcz qold pmwt noqv',
    },
    tls: {
        rejectUnauthorized: false,
    },
    connectionTimeout: 60000,
    socketTimeout: 60000,
});
//generate otp------------------------------------------------------->
function generateOTP() {
    return Math.floor(1000 + Math.random() * 9000);
}
const otp = generateOTP();
console.log(otp);
//sending the generated otp to the user------------------------------------------------------->
const otp1 = async function (req, res) {
    try {
        const existingUser = await User.findOne({ email: req.body.email });
        if (existingUser) {
            req.flash('error', 'User with the provided email already exists');
            return res.render('./user/signup', { error: req.flash('error') });
        }
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const email = req.body.email;
        console.log(email);
        req.session.user = {
            name: req.body.name,
            email: email,
            password: hashedPassword 
        };
        const newOTP = generateOTP();
        req.session.otp = newOTP;
        const mailOptions = {
            to: email,
            subject: "Otp for registration is: ",
            html: "<h3>OTP for account verification is </h3>" + "<h1 style='font-weight:bold;'>" + otp + "</h1>"
        };
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.log(error);
            }
            console.log('Message sent: %s', info.messageId);
            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

            res.render('./admin/otp', { msg: [] });
        });
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).send('Internal Server Error');
    }
};
//verifying generated otp and user entered otp------------------------------------------------------->
const verify = async function (req, res) {
    const user = req.session.user;
    const userOTP = req.body.otp;
    console.log(userOTP);
        console.log(otp);
        if (!user) {
            console.error('User not found in session');
            res.status(500).send('Internal Server Error');
            return;
        }
        console.log(user);
    if (userOTP == otp) {
        console.log(userOTP);
        console.log(otp);
        try {
            if (!user.password) {
                console.error('Password not found in user object');
                res.status(500).send('Internal Server Error');
                return;
            }
            const referral=generateReferralCode()
            const hashedPassword = user.password;
            console.log(hashedPassword);
            const newUser = new User({
                name: user.name,
                email: user.email,
                password: hashedPassword,
                referralCode:referral,                 
            });
            const savedUser = await newUser.save();
            req.session.userId = newUser._id;
            console.log('User data inserted successfully:', savedUser);
            const error1 = "Welcome ,you are a member of Coffee land!";
            res.render('./user/login', { user, error1});
        } catch (error) {
            console.error('Error hashing password or inserting data into MongoDB:', error);
            res.status(500).send('Internal Server Error');
        }
    } else {
       
        res.render('./admin/otp', { msg: 'OTP is incorrect or Time Expires' });
    }
};
//Resend otp to the user------------------------------------------------------->
const resend = function (req, res) {
    const user=req.session.user
    let email=user.email
    console.log(email); // Use the outer email variable
    const mailOptions = {
        to: email,
        subject: "Otp for registration is: ",
        html: "<h3>OTP for account verification is </h3>" + "<h1 style='font-weight:bold;'>" + otp + "</h1>"
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message sent: %s', info.messageId);
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
        res.render('./admin/otp', { msg: "OTP has been sent" });
    });
};
const verifyReferal=async(req,res)=>{
    const { referralCode } = req.body;
    console.log("referal code",{referralCode});
    try {
        const user = await User.findOne({ referralCode });
        if (user) {
            res.json({ valid: true });
        } else {
            res.json({ valid: false });
        }
    } catch (error) {
        console.error('Error validating referral code:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
//module exports------------------------------------------------------->
module.exports = {
    otp1,
    verify,
    resend,
    verifyReferal
    
};
