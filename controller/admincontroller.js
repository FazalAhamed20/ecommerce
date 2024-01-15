const User = require('../models/userModel');
const orderModels = require('../models/orderModel');
const moment = require('moment');
const Chart = require('chart.js');


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
    // Fetch the total number of orders
    const totalOrders = await orderModels.countDocuments();

    // Fetch the total product quantity
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

    // Extract the total product quantity from the result
    const productQuantity = totalProductQuantity.length > 0 ? totalProductQuantity[0].totalProductQuantity : 0;

    // Fetch the total number of users
    const totalUsers = await User.countDocuments();

    // Fetch all orders from the database
    const orders = await orderModels.find();

    // Define the time interval based on the user's selection (daily, monthly, yearly)
    const selectedTimeInterval = req.query.interval || 'daily';

    // Set the time format and unit based on the selected time interval
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


const sales=async (req, res) => {
  try {
      const selectedInterval = req.query.interval;

      let pipeline = [];

      switch (selectedInterval) {
          case 'daily':
              pipeline = [
                  {
                      $match: {
                          // Match orders within the last 24 hours
                          orderDate: { $gte: new Date(moment().subtract(1, 'days')) },
                      },
                  },
                  {
                      $group: {
                          _id: { $dayOfMonth: '$orderDate' },
                          sales: { $sum: '$totals.grandTotal' },
                      },
                  },
              ];
              break;

          case 'weekly':
              pipeline = [
                  {
                      $match: {
                          // Match orders within the last 7 days
                          orderDate: { $gte: new Date(moment().subtract(7, 'days')) },
                      },
                  },
                  {
                      $group: {
                          _id: { $isoWeek: '$orderDate' },
                          sales: { $sum: '$totals.grandTotal' },
                      },
                  },
              ];
              break;

          case 'monthly':
              pipeline = [
                  {
                      $match: {
                          // Match orders within the last 30 days
                          orderDate: { $gte: new Date(moment().subtract(30, 'days')) },
                      },
                  },
                  {
                      $group: {
                          _id: { $month: '$orderDate' },
                          sales: { $sum: '$totals.grandTotal' },
                      },
                  },
              ];
              break;

          default:
              return res.status(400).json({ success: false, error: 'Invalid interval' });
      }

      const monthlySalesData = await orderModels.aggregate(pipeline);

      res.json({ success: true, data: monthlySalesData });
  } catch (error) {
      console.error('Error fetching sales data:', error.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
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
  sales
};
