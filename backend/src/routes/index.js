// routes/index.js
const express = require('express');
const router = express.Router();

// Importer les sous-routeurs
const authRouter = require('./auth');
const boxesRouter = require('./boxes');
const planRouter = require('./plan');
const requestRouter = require('./requests');
const heuresRouter = require('./heures');
const loyersRouter = require('./loyers');          // ← AJOUTE CETTE LIGNE

// Monter les sous-routeurs avec leurs préfixes
router.use('/auth', authRouter);
router.use('/boxes', boxesRouter);
router.use('/plan', planRouter);
router.use('/requests', requestRouter);
router.use('/heures', heuresRouter);
router.use('/loyers', loyersRouter);               // ← AJOUTE CETTE LIGNE (clé !)

// Route health
const healthController = require('../controllers/health.controller');
router.get('/health', healthController.check);

module.exports = router;