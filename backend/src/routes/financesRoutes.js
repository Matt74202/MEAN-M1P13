// src/routes/finances.js
const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { getDashboard, chat } = require('../controllers/financesController');

// GET /api/finances/dashboard - Admin uniquement
router.get('/dashboard', auth, (req, res, next) => {
  if (req.user.role !== 'supermarche') {
    return res.status(403).json({ success: false, message: 'Accès réservé à l\'administrateur' });
  }
  next();
}, getDashboard);

// POST /api/finances/chat - Admin uniquement
router.post('/chat', auth, (req, res, next) => {
  if (req.user.role !== 'supermarche') {
    return res.status(403).json({ success: false, message: 'Accès réservé à l\'administrateur' });
  }
  next();
}, chat);

module.exports = router;