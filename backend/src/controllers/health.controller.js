exports.check = (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'API running securely 🚀'
  });
};
