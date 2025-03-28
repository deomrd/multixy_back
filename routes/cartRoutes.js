const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');  // Importer le contrôleur du panier

// Route pour ajouter un produit au panier
router.post('/create', cartController.addToCart);

// Route pour récupérer les produits d'un utilisateur dans le panier
router.get('/:id_user', cartController.getCartByUser);

// Route pour supprimer un produit du panier
router.delete('/delete/:id_user/:id_product', cartController.removeFromCart);

// Route pour mettre à jour la quantité d'un produit dans le panier
router.put('/update/:id_user/:id_product', cartController.updateCartItemQuantity);

module.exports = router;
