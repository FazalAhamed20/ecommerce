const Offer=require('../models/offerModel')
const Product=require('../models/productModel')
const Category=require('../models/categoryModel')
const mongoose=require('mongoose')

const CategoryOffers = async (req, res) => {
  try {
    const categories = await Category.find();
    const categoryData = [];

    for (const category of categories) {
      const productCount = await Product.countDocuments({ category: category._id });
      const offer = await Offer.findOne({ category: category._id }).populate('category');

      const offerPercentage = offer ? offer.discountPercentage : 0;
      const expiryDate = offer ? formatDate(offer.expiryDate) : null;
      console.log("expiry date",expiryDate);

      categoryData.push({
        categoryid:category._id,
        category: category.name,
        productCount,
        offerPercentage,
        expiryDate,
      });
    }
    console.log(categoryData);

    res.render('./categoryOffer/categoryOffer', { categoryData });
  } catch (error) {
    console.error('Error fetching admin dashboard data:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

function formatDate(date) {
  if (!date) return null;

  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); 
  const day = date.getDate().toString().padStart(2, '0');

  return `${year}-${month}-${day}`;
}


  const editOffer = async (req, res) => {
    try {
        const { category, percentage, expiryDate } = req.params;
        console.log({ category, percentage, expiryDate });

        if (typeof category !== 'string') {
            return res.status(400).json({ success: false, message: 'Invalid category type' });
        }

        const existingCategory = await Category.findOne({ name: category });

        if (!existingCategory) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        const parsedPercentage = parseFloat(percentage);
        console.log('existingCategory', existingCategory);
        console.log('parsedPercentage', parsedPercentage);

        const updatedOffer = await Offer.findOneAndUpdate(
            { category: existingCategory._id },
            { $set: { discountPercentage: parsedPercentage, expiryDate } },
            { new: true, upsert: true }
        );

        res.status(200).json({ success: true, message: 'Offer details updated successfully', offer: updatedOffer });
    } catch (error) {
        console.error('Error updating offer:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};


const deleteOffer = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const deletedOffer = await Offer.findOneAndDelete({ category: categoryId });
    console.log("deleteoffer", deletedOffer);

    if (deletedOffer) {
      return res.json({ success: true, message: 'Offer deleted successfully' });
    } else {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }
  } catch (error) {
    console.error('Error deleting offer:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

module.exports={
    CategoryOffers,
    editOffer,
    deleteOffer
}