const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth'); // ton middleware JWT

const {
  getMesContrats,
  demanderRenouvellement,
  resilierContrat
} = require('../controllers/contratBoutiqueController');

// Routes boutique
router.get('/boutique/mes-contrats', authMiddleware, getMesContrats);
router.post('/boutique/renouveler', authMiddleware, demanderRenouvellement);
router.post('/boutique/resilier', authMiddleware, resilierContrat);

module.exports = router;