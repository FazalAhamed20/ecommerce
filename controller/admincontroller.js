const User = require('../models/userModel');
const orderModels = require('../models/orderModel');

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).send('Internal Server Error');
};
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

    const totalUsers = await User.countDocuments();

    // Render the admin home view with the total number of orders and total product quantity
    res.render('./admin/adhome', { title: 'Admin Home', totalOrders, productQuantity,totalUsers, err: false });
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
  updateOrderstatus
};
