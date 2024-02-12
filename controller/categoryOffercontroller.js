const Offer = require("../models/offerModel");
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const mongoose = require("mongoose");
const { formatDated } = require("../util/helperfunction");
const cron = require("node-cron");
//function to remove expired offers------------------------------------------------------->
const removeExpiredOffers = async () => {
  try {
    const expiredOffers = await Offer.find({ expiryDate: { $lt: new Date() } });

    for (const expiredOffer of expiredOffers) {
      const categoryId = expiredOffer.category;
      const products = await Product.find({ category: categoryId });

      for (const product of products) {
        product.Offerprice = null;
        await product.save();
      }

      await Offer.findOneAndDelete({ category: categoryId });
    }

    console.log("Expired offers removed successfully");
  } catch (error) {
    console.error("Error removing expired offers:", error);
  }
};
cron.schedule("0 0 * * *", async () => {
  await removeExpiredOffers();
});
//Category Offers------------------------------------------------------->

const CategoryOffers = async (req, res) => {
  try {
    const categories = await Category.find();
    const categoryData = [];
    const ITEMS_PER_PAGE = 4;
    const page = parseInt(req.query.page) || 1;
    console.log(page);
    const searchQuery = req.query.search || "";
    console.log(searchQuery);
    for (const category of categories) {
      const productCount = await Product.countDocuments({
        category: category._id,
      });
      const offer = await Offer.findOne({ category: category._id }).populate(
        "category"
      );
      const offerPercentage = offer ? offer.discountPercentage : 0;
      const expiryDate = offer ? formatDated(offer.expiryDate) : null;
      const startDate = offer ? formatDated(offer.startDate) : null;
      if (
        searchQuery &&
        category.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        categoryData.push({
          categoryid: category._id,
          category: category.name,
          productCount,
          offerPercentage,
          startDate,
          expiryDate,
        });
      } else if (!searchQuery) {
        categoryData.push({
          categoryid: category._id,
          category: category.name,
          productCount,
          offerPercentage,
          startDate,
          expiryDate,
        });
      }
    }
    const totalItems = categoryData.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedCategoryData = categoryData.slice(startIndex, endIndex);
    res.render("./categoryOffer/categoryOffer", {
      categoryData: paginatedCategoryData,
      currentPage: page,
      totalPages,
      searchQuery,
    });
  } catch (error) {
    console.error("Error fetching category offers data:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
//Edit offers------------------------------------------------------->
const editOffer = async (req, res) => {
  try {
    const { category, percentage, startDate, expiryDate } = req.params;
    console.log({ category, percentage, startDate, expiryDate });
    if (typeof category !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid category type" });
    }
    const existingCategory = await Category.findOne({ name: category });
    if (!existingCategory) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }
    const parsedPercentage = parseFloat(percentage);
    const updatedOffer = await Offer.findOneAndUpdate(
      { category: existingCategory._id },
      { $set: { discountPercentage: parsedPercentage, startDate, expiryDate } },
      { new: true, upsert: true }
    );
    const products = await Product.find({ category: existingCategory._id });
    for (const product of products) {
      const Offerprice =
        product.price - (product.price * parsedPercentage) / 100;
      product.Offerprice = Offerprice;
      await product.save();
    }

    res
      .status(200)
      .json({
        success: true,
        message: "Offer details and product prices updated successfully",
        offer: updatedOffer,
      });
  } catch (error) {
    console.error("Error updating offer:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
//Delete offer------------------------------------------------------->
const deleteOffer = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const deletedOffer = await Offer.findOneAndDelete({ category: categoryId });
    if (deletedOffer) {
      const products = await Product.find({ category: categoryId });
      for (const product of products) {
        product.Offerprice = null;
        await product.save();
      }
      return res.json({ success: true, message: "Offer deleted successfully" });
    } else {
      return res
        .status(404)
        .json({ success: false, message: "Offer not found" });
    }
  } catch (error) {
    console.error("Error deleting offer:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
//module exports------------------------------------------------------->
module.exports = {
  CategoryOffers,
  editOffer,
  deleteOffer,
};
