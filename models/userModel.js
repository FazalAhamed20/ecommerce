const mongoose = require("mongoose");
require('dotenv').config();
const Address = require('../models/addressModel');

mongoose.connect(process.env.atlas_URL || "mongodb+srv://fazalahamed628:jBKMkSoxwciBSWkA@cluster0.mpqgtyu.mongodb.net/", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch((err) => {
        console.error("MongoDB connection failed:", err);
    });

    const userSchema = new mongoose.Schema({
        name: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true,
            unique: true
        },
        password: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ['active', 'blocked'], // Assuming you want 'active' or 'blocked' status
            default: 'active' // Set the default status to 'active'
        },
        socketId: {
            type: String, // Assuming you store the socket ID as a string
            default: null // Set the default value to null
        },
        
      
    });
    
    const User = mongoose.model('User', userSchema);
    
    module.exports = User;

