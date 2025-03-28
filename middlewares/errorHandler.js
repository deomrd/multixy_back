const errorHandler = (err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    message: 'Une erreur interne est survenue',
  });
};

module.exports = errorHandler;
