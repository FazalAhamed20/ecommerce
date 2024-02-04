const User = require("../models/userModel");
const orderModels = require("../models/orderModel");
const moment = require("moment");
const Chart = require("chart.js");
const fs = require("fs");
const ejs = require("ejs");
const CanceledOrder = require("../models/orderCancelModel");
const puppeteer=require('puppeteer')
//admin login------------------------------------------------------->
const admin = (req, res) => {
  if (req.session.admin != null) {
    res.redirect("/adhome");
  }
  res.render("./admin/adlog", { title: "user login", err: false });
};
//admin home------------------------------------------------------->
const adhome = async (req, res) => {
  try {
    const totalOrders = await orderModels.countDocuments();
    const totalProductQuantity = await orderModels
      .aggregate([
        {
          $unwind: "$products",
        },
        {
          $group: {
            _id: null,
            totalProductQuantity: { $sum: "$products.quantity" },
          },
        },
      ])
      .exec();
    const productQuantity =
      totalProductQuantity.length > 0
        ? totalProductQuantity[0].totalProductQuantity
        : 0;
    const totalUsers = await User.countDocuments();
    const orders = await orderModels.find();
    const selectedTimeInterval = req.query.interval || "daily";
    let timeFormat, timeUnit, dateFormat;
    if (selectedTimeInterval === "monthly") {
      timeFormat = "%Y-%m";
      timeUnit = "$month";
      dateFormat = "MMMM YYYY";
    } else if (selectedTimeInterval === "yearly") {
      timeFormat = "%Y";
      timeUnit = "$year";
      dateFormat = "YYYY";
    } else {
      timeFormat = "%Y-%m-%d";
      timeUnit = "$dayOfMonth";
      dateFormat = "MMMM DD, YYYY";
    }
    const ordersWithDate = await orderModels
      .aggregate([
        {
          $match: { orderDate: { $exists: true } },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: timeFormat,
                date: "$orderDate",
                timezone: "+0530",
              },
            },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            date: "$_id",
            count: 1,
          },
        },
        {
          $sort: { date: 1 },
        },
      ])
      .exec();
    const validOrdersWithDate = ordersWithDate.filter(
      (order) => order.date && order.date !== "null"
    );
    const xValues = validOrdersWithDate.map((order) => order.date);
    const yValues = validOrdersWithDate.map((order) => order.count);
    const recentlyPlacedOrders = await orderModels
      .find()
      .sort({ orderDate: -1 })
      .populate("products.product")
      .limit(5);
    res.render("./admin/adhome", {
      title: "Admin Home",
      totalOrders,
      productQuantity,
      totalUsers,
      orders,
      xValues: JSON.stringify(xValues),
      yValues,
      recentlyPlacedOrders,
      selectedTimeInterval,
      dateFormat,
      err: false,
    });
  } catch (error) {
    console.error("Error fetching data:", error.message);
    res.status(500).send("Internal server error");
  }
};
//checking email and password of admin------------------------------------------------------->
const dashboard = (req, res) => {
  const credential = {
    email: "admin@gmail.com",
    password: 1,
  };
  const userInput = {
    email: req.body.email,
    password: parseInt(req.body.password),
  };
  if (
    userInput.email === credential.email &&
    userInput.password === credential.password
  ) {
    req.session.admin = userInput.email;
    req.session.adLogged = true;
    res.redirect("/adhome");
  } else {
    const err = "Invalid Username or Password";
    res.render("./admin/adlog", { err: err });
  }
};
const users = async (req, res) => {
  const itemsPerPage = 3;
  const page = parseInt(req.query.page) || 1;
  try {
    const totalUsers = await User.countDocuments();
    const totalPages = Math.ceil(totalUsers / itemsPerPage);
    const users = await User.find()
      .skip((page - 1) * itemsPerPage)
      .limit(itemsPerPage);
    res.render("./admin/userlist", {
      title: "users",
      users,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).send("Internal Server Error");
  }
};
//blocking user in admin side------------------------------------------------------->
const block = async (req, res) => {
  const { userId } = req.body;
  try {
    const user = await User.findById(userId);
    if (user) {
      user.status = "blocked";
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
//unblocking user in admin side------------------------------------------------------->
const unblock = async (req, res) => {
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
    const orders = await orderModels
      .find()
      .sort({ _id: -1 })
      .skip((page - 1) * itemsPerPage)
      .limit(itemsPerPage)
      .populate({
        path: "products.product",
        model: "Product",
        select: "name price description image",
      })
      .exec();

    const canceledOrders = await Promise.all(
      orders.map(async (order) => {
        const canceledOrder = await CanceledOrder.findOne({
          orderID: order.orderID,
        });
        return canceledOrder || null;
      })
    );
    const formattedOrders = orders.map((order) => ({
      ...order._doc,
      deliveryDate: order.deliveryDate.toLocaleDateString("en-IN"),
    }));

    res.render("./admin/userOrder", {
      title: "User Orders",
      orders: formattedOrders,
      canceledOrders,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).send("Internal Server Error");
  }
};

//update order status------------------------------------------------------->
const updateOrderstatus = async (req, res) => {
  try {
    const updatedOrders = req.body;
    for (const updatedOrder of updatedOrders) {
      const { orderID, status } = updatedOrder;
      await orderModels.findOneAndUpdate(
        { orderID: orderID },
        { $set: { status: status } }
      );
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};
//logout------------------------------------------------------->
const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
    } else {
      res.redirect("/admin/login");
    }
  });
};
//generateSalesReport------------------------------------------------------->
const generateSalesReport = async (req, res) => {
  try {
    const startDate = req.query.startDate
      ? moment(req.query.startDate).startOf("day")
      : moment().startOf("day");
    const endDate = req.query.endDate
      ? moment(req.query.endDate).endOf("day")
      : moment().endOf("day");
    const orders = await orderModels
      .find({
        orderDate: { $gte: startDate.toDate(), $lte: endDate.toDate() },
        status: "delivered",
      })
      .populate("customer products.product");

    const formattedStartDate = startDate.format("YYYY-MM-DD HH:mm:ss");
    const formattedEndDate = endDate.format("YYYY-MM-DD HH:mm:ss");

    const templatePath = "views/admin/salesReport.ejs";
    const templateContent = fs.readFileSync(templatePath, "utf-8");
    const renderedHTML = ejs.render(templateContent, {
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      orders,
    });

    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setContent(renderedHTML);

    const pdfBuffer = await page.pdf({ format: 'Letter' });

    await browser.close();

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=SalesReport_${formattedStartDate}_to_${formattedEndDate}.pdf`
    );
    res.setHeader("Content-Type", "application/pdf");
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating sales report:", error.message);
    res.status(500).send(`Internal server error: ${error.message}`);
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
  generateSalesReport,
};
