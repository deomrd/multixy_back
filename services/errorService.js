const sendErrorMessage = (res, statusCode, message) => {
  res.status(statusCode).json({
    success: false,
    message: message,
  });
};

module.exports = {
  sendErrorMessage,
};
