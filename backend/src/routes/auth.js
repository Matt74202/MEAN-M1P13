const express = require('express');
const router = express.Router();
const { login, getMe, register } = require('../controllers/authController');
const { body } = require('express-validator');
const authMiddleware = require('../middlewares/auth');

// Route de test
router.get('/test', (req, res) => {
  console.log('Route /test appelée');
  res.json({ 
    success: true, 
    message: 'API auth fonctionne',
    timestamp: new Date().toISOString()
  });
});

// POST /api/auth/register (modifié pour rôle et champs supplémentaires)
router.post('/register',
  [
    body('nom').notEmpty().withMessage('Nom requis').trim().isLength({ min: 2 }).withMessage('Le nom doit avoir au moins 2 caractères'),
    body('mail').isEmail().withMessage('Email invalide').normalizeEmail(),
    body('mdp').isLength({ min: 6 }).withMessage('Le mot de passe doit avoir au moins 6 caractères'),
    body('adresse').optional().trim(),
    body('role').isIn(['supermarche', 'boutique', 'client']).withMessage('Rôle invalide'),  // Validation rôle
    // Validations conditionnelles (ex. pour boutique)
    body('description').if(body('role').equals('boutique')).notEmpty().withMessage('Description requise pour boutique'),
    body('typeCommerce').if(body('role').equals('boutique')).notEmpty().withMessage('Type de commerce requis pour boutique'),
    // Ajoutez d'autres pour contact, logo, prenom si besoin
  ],
  register
);

// POST /api/auth/login
router.post('/login',
  [
    body('mail')
      .isEmail().withMessage('Email invalide')
      .normalizeEmail(),
    body('mdp')
      .notEmpty().withMessage('Mot de passe requis')
  ],
  login
);

// GET /api/auth/me → récupérer les infos de l'utilisateur connecté
router.get('/me', authMiddleware, getMe);

module.exports = router;