// routes/loyers.js
const express = require('express');
const router = express.Router();

// Contrôleurs (tu peux les créer ou les inline pour tester)
const { getBoutiques, getAllLoyersAdmin, getLoyersBoutique, payerLoyer } = require('../controllers/loyerController');

// Middleware auth (je suppose que tu l'as déjà)
const authMiddleware = require('../middlewares/auth');

// Routes admin (supermarché)
router.get('/admin', authMiddleware, getAllLoyersAdmin);           // tous les loyers (filtré)
router.get('/boutiques', authMiddleware, getBoutiques);           // liste des boutiques pour le filtre dropdown

// Routes boutique
router.get('/boutique', authMiddleware, getLoyersBoutique);       // loyers de la boutique connectée
router.put('/:id/payer', authMiddleware, payerLoyer);             // payer un loyer spécifique

// Route de test rapide (supprime-la plus tard si tu veux)
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Route loyers fonctionne !' });
});

module.exports = router;