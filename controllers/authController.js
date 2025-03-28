const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { sendErrorMessage } = require('../services/errorService');
const { handleTryCatch } = require('../services/tryCatchService');
const prisma = new PrismaClient();
const crypto = require('crypto');

// Générer les tokens (Access Token et Refresh Token)
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { userId: user.id_user, email: user.email },
    'multixy est une plateforme de vente ultra performante', // Clé secrète pour l'access token
    { expiresIn: '1h' } // Access token expirant après 1 heure
  );

  const refreshToken = jwt.sign(
    { userId: user.id_user, email: user.email },
    'multixy est une plateforme simple pour l\'utilisation', // Clé secrète pour le refresh token
    { expiresIn: '7d' } // Refresh token expirant après 7 jours
  );

  return { accessToken, refreshToken };
};

// Fonction pour la connexion de l'utilisateur avec les relations
const login = async (req, res) => {
  const { email, password } = req.body;

  await handleTryCatch(async () => {
    // Vérifier si l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        orders: true, // Inclut les commandes de l'utilisateur
        cart: true, // Inclut les articles du panier
        productReviews: true, // Inclut les avis produits
        wishlist: true, // Inclut les éléments de la wishlist
        supportMessages: true, // Inclut les messages de support
        administrator: true, // Inclut l'administrateur s'il existe
      }
    });

    if (!user) {
      throw { code: 401, message: 'Email ou mot de passe incorrect' };
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw { code: 401, message: 'Email ou mot de passe incorrect' };
    }

    // Générer les tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Stocker le refresh token dans un cookie sécurisé
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true, // Empêche l'accès au cookie via JavaScript
      secure: process.env.NODE_ENV === 'production', // Assurez-vous que le cookie est sécurisé en production
      sameSite: 'Strict', // Empêche l'envoi du cookie en cross-site request
      maxAge: 7 * 24 * 60 * 60 * 1000, // Durée du refresh token (7 jours)
    });

    res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      accessToken,
      user: {
        id_user: user.id_user,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        orders: user.orders, // Renvoie les commandes de l'utilisateur
        cart: user.cart, // Renvoie les articles du panier
        productReviews: user.productReviews, // Renvoie les avis produits
        wishlist: user.wishlist, // Renvoie la wishlist
        supportMessages: user.supportMessages, // Renvoie les messages de support
        administrator: user.administrator, // Renvoie les données de l'administrateur
      },
    });
  }, res);
};

// Fonction pour rafraîchir l'access token en utilisant le refresh token
const refreshAccessToken = async (req, res) => {
  const refreshToken = req.cookies.refresh_token;

  if (!refreshToken) {
    return res.status(403).json({ message: 'Refresh token manquant' });
  }

  jwt.verify(refreshToken, 'multixy est une plateforme simple pour l\'utilisation', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Refresh token invalide' });
    }

    // Générer un nouveau access token
    const { accessToken } = generateTokens(user);

    res.status(200).json({
      success: true,
      accessToken, // Nouveau token d'accès
    });
  });
};

// Middleware pour vérifier l'authentification (access token)
const verifyAccessToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(403).json({ message: 'Token manquant' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, 'multixy est une plateforme de vente ultra performante', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token invalide' });
    }

    req.user = user; // Ajouter les informations de l'utilisateur à la requête
    next();
  });
};

// Fonction de déconnexion (supprimer le cookie du refresh token)
const logout = (req, res) => {
  res.clearCookie('refresh_token', {
    httpOnly: true, // Empêche l'accès au cookie via JavaScript
    secure: process.env.NODE_ENV === 'production', // Assurez-vous que le cookie est sécurisé en production
    sameSite: 'Strict', // Protéger contre le CSRF
  });

  res.status(200).json({
    success: true,
    message: 'Déconnexion réussie',
  });
};

// Limiter les tentatives de connexion (Brute Force) avec express-rate-limit
const rateLimiter = require('express-rate-limit');
const loginLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limiter à 5 tentatives
  message: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.',
});

module.exports = {
  login,
  refreshAccessToken,
  verifyAccessToken,
  logout,
  loginLimiter,
};
