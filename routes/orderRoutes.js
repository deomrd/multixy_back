const express = require('express');
const router = express.Router();
const { createOrder, updateOrderStatus } = require('../controllers/orderController');

// Route pour créer une commande
router.post('/create', createOrder);

// Route pour mettre à jour le statut d'une commande
router.put('/update/:id_order', updateOrderStatus);

module.exports = router;
