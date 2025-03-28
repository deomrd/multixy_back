// Importation des dépendances nécessaires
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const { login, refreshAccessToken, verifyAccessToken, logout, loginLimiter } = require('./controllers/authController'); // Assure-toi d'importer le bon chemin

// Chargement des variables d'environnement
dotenv.config();

// Création de l'application Express
const app = express();

// Middlewares
app.use(cors()); // Pour gérer les CORS
app.use(morgan('dev')); // Logger des requêtes HTTP
app.use(express.json()); // Pour pouvoir traiter les requêtes avec des données JSON
app.use(cookieParser()); // Pour gérer les cookies (notamment pour le refresh token)

// Servir les fichiers statiques du répertoire 'public'
app.use(express.static('public'));

// Connexion à la base de données Prisma pour vérifier la connexion
const prisma = new PrismaClient();
prisma.$connect()
  .then(() => {
    console.log('Base de données connectée avec succès');
  })
  .catch((err) => {
    console.error('Erreur de connexion à la base de données:', err);
  });

// Routes
// ces routes sont prefixees par api/table
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/carts', cartRoutes);   
app.use('/api/orders', orderRoutes);

// Route de connexion
app.post('/login', loginLimiter, login); // Limite les tentatives de connexion
app.post('/refresh-token', refreshAccessToken);
app.post('/logout', logout);

// Route protégée
app.get('/protected-route', verifyAccessToken, (req, res) => {
  res.status(200).json({
    message: 'Accès autorisé à la route protégée',
    user: req.user, // Accès aux informations de l'utilisateur
  });
});
app.use(express.static(path.join(__dirname, '../client/public')));
app.use('/images', express.static(path.join(__dirname, '../client/public/images')));


// Route par défaut pour servir le fichier index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/public/index.html'));
});

// Gestion des erreurs non trouvées (404)
app.use((req, res, next) => {
  res.status(404).json({ message: 'Ressource non trouvée' });
});

// Gestion des erreurs générales (500)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Erreur serveur interne' });
});

app.use((req, res, next) => {
  console.log(`Requête reçue : ${req.method} ${req.url}`);
  next();
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});