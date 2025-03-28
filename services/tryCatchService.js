// Fonction générique pour gérer les erreurs
const handleTryCatch = async (callback, res) => {
  try {
    await callback();
  } catch (error) {
    const statusCode = error.code || 500;
    const message = error.message || 'Erreur interne du serveur';
    sendErrorMessage(res, statusCode, message); // Utilisation de la fonction générique d'erreur
  }
};

const sendErrorMessage = (res, statusCode, message) => {
  res.status(statusCode).json({ success: false, message });
};

module.exports = { handleTryCatch };
