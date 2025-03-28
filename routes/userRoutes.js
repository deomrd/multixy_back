const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Route pour récupérer tous les utilisateurs
router.get('/', userController.getAllUsers);

// Route pour créer un utilisateur
router.post('/create', userController.createUser);

// Route pour mettre à jour un utilisateur
router.put('/update/:id', userController.updateUser);

// Route pour mettre à jour un utilisateur
router.put('/password/:id', userController.updatePasswordUser);

// Route pour supprimer un utilisateur (soft delete)
router.delete('/delete/:id', userController.deleteUser);

// Route pour récupérer un utilisateur par ID
router.get('/:id', userController.getUserById);


module.exports = router;
