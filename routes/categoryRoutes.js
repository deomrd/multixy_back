const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');


// Route pour afficher tous les utilisateurs
router.get('/', categoryController.getAllCategories);

// Route pour créer un utilisateur
router.post('/create', categoryController.createCategory);

// Route pour mettre à jour un utilisateur
router.put('/update/:id', categoryController.updateCategory);

// Route pour supprimer un utilisateur (soft delete)
router.delete('/delete/:id', categoryController.deleteCategory);

// Route pour récupérer un utilisateur par ID
router.get('/:id', categoryController.getCategoryById);



module.exports = router;
