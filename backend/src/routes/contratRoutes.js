// src/routes/contratRoutes.js
const express = require('express');
const router  = express.Router();

const {
  createContrat,
  getAllContrats,
  getContratById,
  updateContrat,
  deleteContrat,
} = require('../controllers/contratController');

const {
  getMesContrats,
  demanderRenouvellement,
  resilierContrat,
} = require('../controllers/contratBoutiqueController');

const authMiddleware    = require('../middlewares/auth');
const validateObjectId  = require('../middlewares/validateObjectId');

// ─────────────────────────────────────────────────────────────
// Routes boutique (authentifiées) — AVANT /:id pour éviter
// que "boutique" soit interprété comme un ObjectId
// ─────────────────────────────────────────────────────────────
router.get ('/boutique/mes-contrats', authMiddleware, getMesContrats);
router.post('/boutique/renouveler',   authMiddleware, demanderRenouvellement);
router.post('/boutique/resilier',     authMiddleware, resilierContrat);

// ─────────────────────────────────────────────────────────────
// Routes admin CRUD
// ─────────────────────────────────────────────────────────────
router.route('/')
  .post(createContrat)
  .get(getAllContrats);

router.route('/:id')
  .get(validateObjectId,    getContratById)
  .put(validateObjectId,    updateContrat)
  .delete(validateObjectId, deleteContrat);

module.exports = router;