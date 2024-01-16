const User = require('../models/userModel');
const orderModels = require('../models/orderModel');
const moment = require('moment');
const Chart = require('chart.js');
const PDFDocument = require('jspdf');


//admin login------------------------------------------------------->
const admin = (req, res) => {
  if(req.session.admin!=null){
     res.redirect("/adhome");
  }
  res.render('./admin/adlog', { title: 'user login', err: false });
};
//admin home------------------------------------------------------->
const adhome = async (req, res) => {
  try {
    
    const totalOrders = await orderModels.countDocuments();

   
    const totalProductQuantity = await orderModels.aggregate([
      {
        $unwind: '$products',
      },
      {
        $group: {
          _id: null,
          totalProductQuantity: { $sum: '$products.quantity' },
        },
      },
    ]).exec();

   
    const productQuantity = totalProductQuantity.length > 0 ? totalProductQuantity[0].totalProductQuantity : 0;

    
    const totalUsers = await User.countDocuments();

   
    const orders = await orderModels.find();

   
    const selectedTimeInterval = req.query.interval || 'daily';

    
    let timeFormat, timeUnit, dateFormat;
    if (selectedTimeInterval === 'monthly') {
      timeFormat = '%Y-%m';
      timeUnit = '$month';
      dateFormat = 'MMMM YYYY';
    } else if (selectedTimeInterval === 'yearly') {
      timeFormat = '%Y';
      timeUnit = '$year';
      dateFormat = 'YYYY';
    } else {
      timeFormat = '%Y-%m-%d';
      timeUnit = '$dayOfMonth';
      dateFormat = 'MMMM DD, YYYY';
    }

    // Aggregate orders based on the selected time interval and calculate the count for each period
    const ordersWithDate = await orderModels.aggregate([
      {
        $match: { "orderDate": { $exists: true } }
      },
      {
        $group: {
          _id: { $dateToString: { format: timeFormat, date: "$orderDate", timezone: "+0530" } },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          count: 1
        }
      },
      {
        $sort: { date: 1 } // Sort by date in ascending order
      }
    ]).exec();

    console.log("ordersWithDate", ordersWithDate);

    // Filter out entries with invalid dates
    const validOrdersWithDate = ordersWithDate.filter(order => order.date && order.date !== 'null');

    // Extract unique order dates
    const xValues = validOrdersWithDate.map(order => order.date);
    const yValues = validOrdersWithDate.map(order => order.count);

    // Fetch recently placed orders
    const recentlyPlacedOrders = await orderModels.find().sort({ orderDate: -1 }).limit(5);
    console.log("recent orders", recentlyPlacedOrders);

    // Pass data to the EJS template
    res.render('./admin/adhome', {
      title: 'Admin Home',
      totalOrders,
      productQuantity,
      totalUsers,
      orders,
      xValues: JSON.stringify(xValues), // Convert to JSON string for passing to client-side script
      yValues,
      recentlyPlacedOrders,
      selectedTimeInterval,
      dateFormat,
      err: false,
    });
  } catch (error) {
    console.error('Error fetching data:', error.message);
    res.status(500).send('Internal server error'); // Handle error appropriately
  }
};

//checking email and password of admin------------------------------------------------------->
const dashboard = (req, res) => {
  const credential = {
    email: 'admin@gmail.com',
    password: 1,
  };
  const userInput = {
    email: req.body.email,
    password: parseInt(req.body.password),
  };

  if (userInput.email === credential.email && userInput.password === credential.password) {
    req.session.admin = userInput.email;
    req.session.adLogged = true;
    res.redirect('/adhome');
  } else {
    const err = 'Invalid Username or Password';
    res.render('./admin/adlog', { err: err });
  }
};
const users = async (req, res) => {
  const itemsPerPage = 3; // pagination
  const page = parseInt(req.query.page) || 1;
  try {
    const totalUsers = await User.countDocuments();
    const totalPages = Math.ceil(totalUsers / itemsPerPage);

    const users = await User.find()
      .skip((page - 1) * itemsPerPage)
      .limit(itemsPerPage);

    res.render('./admin/userlist', {
      title: 'users',
      users,  
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).send('Internal Server Error');
  }
};
//blocking user in admin side------------------------------------------------------->
const block=async (req, res) => {
  const { userId } = req.body;
  try {
    const user = await User.findById(userId);
    if (user) {
      user.status = "blocked";
      await user.save();
     return  res.redirect("/adlog");
    } else {
      return res.send("User not found");
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
};
//unblocking user in admin side------------------------------------------------------->
const unblock=async (req, res) => {
  const { userId } = req.body;
  try {
    const user = await User.findById(userId);
    if (user) {
      user.status = "active";
      await user.save();
      return res.redirect("/adlog");
    } else {
      return res.send("User not found");
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
};
//admin order side------------------------------------------------------->
const userOrder = async (req, res) => {
  const itemsPerPage = 3;
  const page = parseInt(req.query.page) || 1;
  try {
    const totalOrders = await orderModels.countDocuments();
    const totalPages = Math.ceil(totalOrders / itemsPerPage);
    const orders = await orderModels.find()
      .skip((page - 1) * itemsPerPage)
      .limit(itemsPerPage)
      .populate({
        path: 'products.product',
        model: 'Product', 
        select: 'name price description image',
      })
      .exec();
    res.render('./admin/userOrder', {
      title: 'User Orders',
      orders,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).send('Internal Server Error');
  }
};
//update order status------------------------------------------------------->
const updateOrderstatus = async (req, res) => {
  try {
    const updatedOrders = req.body;
    for (const updatedOrder of updatedOrders) {
      const { orderID, status } = updatedOrder;
      await orderModels.findOneAndUpdate({ orderID: orderID }, { $set: { status: status } });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};
//logout------------------------------------------------------->
const logout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
    } else {
      res.redirect('/admin/login'); 
    }
  });
};



const generateSalesReport = async (req, res) => {
  try {
    console.log('Inside generateSalesReport function');
    const selectedTimeInterval = req.query.timeInterval || 'daily';
    console.log(selectedTimeInterval);

    let startDate, endDate;

    if (selectedTimeInterval === 'daily') {
      startDate = moment().startOf('day');
      endDate = moment().endOf('day');
    } else if (selectedTimeInterval === 'weekly') {
      startDate = moment().startOf('week');
      endDate = moment().endOf('week');
    } else if (selectedTimeInterval === 'yearly') {
      startDate = moment().startOf('year');
      endDate = moment().endOf('year');
    } else {
      // Handle additional time intervals if needed
    }

    // Fetch orders within the specified date range
    const orders = await orderModels.find({
      orderDate: { $gte: startDate, $lte: endDate },
      status: 'Delivered',
    }).populate('customer products.product');

    // Create a PDF document
    const pdf = new PDFDocument();
    pdf.text(`Sales Report (${selectedTimeInterval})`, 20, 20);
    // Add more content to the PDF as needed...

    // Set response headers for file download
    res.setHeader('Content-Disposition', `attachment; filename=SalesReport_${selectedTimeInterval}_${moment().format('YYYY-MM-DD')}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');

    // Stream the PDF directly to the response object
    pdf.pipe(res);
    pdf.end();

  } catch (error) {
    console.error('Error generating sales report:', error.message);
    res.status(500).send('Internal server error');
  }
};








//module exports------------------------------------------------------->
module.exports = {
  admin,
  dashboard,
  adhome,
  users,
  block,
  unblock,
  logout,
  userOrder,
  updateOrderstatus,
  generateSalesReport
  
};
