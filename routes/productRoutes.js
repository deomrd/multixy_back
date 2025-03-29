const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Route pour récupérer tous les produits
router.get('/', productController.getAllProducts);

// Route pour récupérer tous les produits avec scroll
router.get('/scroll', productController.getAllProductsScroll);

// Route pour récupérer un produit par ID
router.get('/:id', productController.getProductById);

// Route pour créer un produit
router.post('/create', productController.createProduct);

// Route pour mettre à jour un produit
router.put('/update/:id', productController.updateProduct);

// Route pour supprimer un produit (soft delete)
router.delete('/delete/:id', productController.deleteProduct);

// Route pour rechercher des produits
router.get('/products/search', productController.searchProducts);

module.exports = router;
