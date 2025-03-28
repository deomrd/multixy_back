const express = require('express');
const router = express.Router();
const { login, refreshAccessToken, logout, loginLimiter } = require('../controllers/authController');
const { verifyAccessToken } = require('../controllers/authController');

// Route pour la connexion (login)
router.post('/login', loginLimiter, login);  // Limite le nombre de tentatives de connexion

// Route pour rafraîchir l'Access Token en utilisant le Refresh Token
router.post('/refresh', refreshAccessToken);

// Route pour la déconnexion
router.post('/logout', logout);

// Exemple d'une route protégée (requiert un access token valide)
router.get('/profile', verifyAccessToken, (req, res) => {
  // Cette route est protégée, l'utilisateur doit être connecté (authentifié)
  res.status(200).json({
    success: true,
    message: 'Voici les informations de votre profil',
    user: req.user,
  });
});

module.exports = router;
