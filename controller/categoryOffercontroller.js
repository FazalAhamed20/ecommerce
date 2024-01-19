const Offer=require('../models/offerModel')
const Product=require('../models/productModel')
const Category=require('../models/categoryModel')







const CategoryOffers=async (req, res) => {
    try {
      const categories = await Category.find();
      const categoryData = [];
  
      for (const category of categories) {
        const productCount = await Product.countDocuments({ category: category._id });
        const offer = await Offer.findOne({ _id: category.offer });
        const offerPercentage = offer ? offer.discountPercentage : 0;
  
        categoryData.push({
          category: category.name,
          productCount,
          offerPercentage,
        });
      }
  
      res.render('./categoryOffer/categoryOffer', { categoryData });
    } catch (error) {
      console.error('Error fetching admin dashboard data:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  };
  const editOffer = async (req, res) => {
    try {
        const { category, percentage } = req.params;
        console.log({ category, percentage });

        // Validate if category is a string
        if (typeof category !== 'string') {
            return res.status(400).json({ success: false, message: 'Invalid category type' });
        }

        // Assume you're fetching the products for the given category
        const products = await Product.find({ category });

        // Update the offer percentage for each product
        for (const product of products) {
            // Update the offer percentage for each product
            product.price -= (product.price * (percentage / 100));
            await product.save();
        }

        res.status(200).json({ success: true, message: 'Offer percentage updated successfully' });
    } catch (error) {
        console.error('Error updating offer:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};




module.exports={
    CategoryOffers,
    editOffer
}