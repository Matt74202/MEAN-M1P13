// routes/index.js
const express = require('express');
const router = express.Router();

// Importer les sous-routeurs
const authRouter = require('./auth');
const boxesRouter = require('./boxes');
const planRouter = require('./plan');      // ← AJOUTÉ ICI (ton fichier plan.js)

// Monter les sous-routeurs avec leurs préfixes
router.use('/auth', authRouter);
router.use('/boxes', boxesRouter);
router.use('/plan', planRouter);           // ← AJOUTÉ ICI (montage de /plan)

// Route health (déjà présente)
const healthController = require('../controllers/health.controller');
router.get('/health', healthController.check);

// Tu pourras ajouter plus tard :
// router.use('/products', require('./products'));
// etc.

module.exports = router;