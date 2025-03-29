const multer = require('multer');
const path = require('path');

// Configuration de Multer pour enregistrer les images dans le dossier 'uploads'
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/'); // Dossier où stocker les images
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Nom de fichier unique
  },
});

// Filtrer les fichiers acceptés (seulement les images)
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Seules les images (JPEG, PNG) sont autorisées'), false);
  }
};

// Middleware Multer pour gérer l'upload d'une seule image
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // Taille maximale : 5 Mo
}).single('image'); // Nom du champ attendu dans le formulaire

module.exports = upload;
