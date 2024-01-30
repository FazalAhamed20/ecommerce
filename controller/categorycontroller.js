const Category = require('../models/categoryModel');
//categorylist in admin side------------------------------------------------------->
const categoryList = async (req, res) => {
    const itemsPerPage = 3; //pagination
    const page = parseInt(req.query.page) || 1;
    const searchQuery = req.query.search || '';
    console.log('Search Query:', searchQuery); 
    try {
        let query = {};
        if (searchQuery) {
            query = {
                $or: [
                    { name: { $regex: searchQuery, $options: 'i' } },
                ].filter(Boolean),
            };
        }
        const totalCategories = await Category.countDocuments(query);
        const totalPages = Math.ceil(totalCategories / itemsPerPage);
        const categories = await Category.find(query)
            .skip((page - 1) * itemsPerPage)
            .limit(itemsPerPage)
            .sort({ _id: -1 });
        res.render('./categories/category', {
            title: 'categories',
            categories,
            totalPages,
            currentPage: page,
            error: '',
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).send('Internal Server Error');
    }
};
// create category in admin side------------------------------------------------------->
  const createcat = function(req, res) {
    const error= req.flash('error');
    res.render('./categories/createcat',{error:error});
};
//add category in admin side------------------------------------------------------->
const addcat = function(req, res) {
    const categoryName = req.body.categoryName;
    Category.findOne({ name: categoryName })
        .then(existingCategory => {
            if (existingCategory) {
                const error = "Category already exists";
                req.flash('error', error);
                res.redirect('/createcat');
            } else {
                const newCategory = new Category({ name: categoryName });
                newCategory.save()
                    .then(() => {
                        res.redirect('/category');
                    })
                    .catch(err => {
                        console.error(err);
                        res.status(500).send('Internal Server Error');
                    });
            }
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Internal Server Error');
        });
};
//finding category by id in database------------------------------------------------------->
const editform = function(req, res) {
    const categoryId = req.params.id;
    Category.findById(categoryId)
        .then(category => {
            res.render('./categories/editcat', { category });
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Internal Server Error');
        });
};
//Edit category in admin side------------------------------------------------------->
const editcat = function(req, res) {
    const categoryId = req.params.id;
    const updatedName = req.body.updatedName;
    Category.findByIdAndUpdate(categoryId, { name: updatedName })
        .then(() => {
            res.redirect('/category');
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Internal Server Error');
        });
};
//find the delete category bu id------------------------------------------------------->
const confirmdel = function(req, res) {
    const categoryId = req.params.id;
    Category.findById(categoryId)
        .then(category => {
            res.render('./categories/delete', { category });
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Internal Server Error');
        });
};
//Delete category in admin side------------------------------------------------------->
const deletecat = function(req, res) {
    const categoryId = req.params.id;
    Category.findOneAndDelete({ _id: categoryId })
        .then(() => {
            res.redirect('/category');
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Internal Server Error');
        });
};
//module exports------------------------------------------------------->
module.exports={
   categoryList,
   createcat,
   addcat,
   editcat,
   editform,
   confirmdel,
   deletecat
}