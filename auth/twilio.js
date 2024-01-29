// const cron = require('node-cron');
// const twilio = require('twilio');
// const User=require('../models/userModel')
// const Reminder=require('../models/reminderModel')
// const cron = require('node-cron');
// require("dotenv").config();

// const accountSid = process.env.accountSid;
// const authToken = process.env.authToken;
// const twilioPhoneNumber = process.env.twilioPhoneNumbe;

// const client = new twilio(accountSid, authToken);

// const sendSMS = async (to, message) => {
//     try {
//         const result = await client.messages.create({
//             body: message,
//             from: twilioPhoneNumber,
//             to,
//         });

//         console.log('SMS sent successfully. SID:', result.sid);
//     } catch (error) {
//         console.error('Error sending SMS:', error.message);
//     }
// };
// cron.schedule('* * * * *', async () => {
//     try {
//         const currentHour = new Date().getHours();
//         const currentMinute = new Date().getMinutes();
//         const reminders = await Reminder.find();
//         reminders.forEach(async (reminder) => {
//             const { userId, coffeeTime, phoneNumber } = reminder;
//             const [hour, minute] = coffeeTime.split(':');
//             if (parseInt(hour) === currentHour && parseInt(minute) === currentMinute) {
//                 try {
//                     const user = await User.findById(userId);
//                     if (user) {
//                         const userName = user.name;
//                         const message = `Hey ${userName}, don't forget your coffee time at ${coffeeTime} ☕️ from COFFEE LAND`;
//                         await sendSMS(phoneNumber, message);
//                     } else {
//                         console.error(`User with ID ${userId} not found.`);
//                     }
//                 } catch (error) {
//                     console.error('Error fetching user information:', error.message);
//                 }
//             }
//         });
//     } catch (error) {
//         console.error('Error processing reminders:', error.message);
//     }
// });
// module.exports={
//     sendSMS
// }