const nodemailer = require("nodemailer");
require("dotenv").config();

let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    service: 'Gmail',
    auth: {
        user:process.env.USER_EMAIL,
        pass:process.env.USER_PASS,
    },
    tls: {
        rejectUnauthorized: false,
    },
    connectionTimeout: 60000,
    socketTimeout: 60000,
});
module.exports={
    transporter
}