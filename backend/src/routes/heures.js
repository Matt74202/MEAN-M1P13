// routes/heures.js
const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const Heure = require('../models/heure');             // supermarché
const HeureBoutique = require('../models/heureBoutique');

// ────────────────────────────────────────────────
// SUPER MARCHÉ – ADMIN SEULEMENT
// ────────────────────────────────────────────────

// GET /api/heures/supermarche
// Récupère les horaires complets du supermarché (standards + exceptions)
router.get('/supermarche', auth, async (req, res) => {
  try {
    let heure = await Heure.findOne();

    // Si rien n'existe encore → on crée un document par défaut
    if (!heure) {
      heure = new Heure({
        jour: [],
        exceptions: []
      });
      await heure.save();
    }

    res.json({
      success: true,
      data: heure
    });
  } catch (err) {
    console.error('[GET /heures/supermarche] Erreur :', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PUT /api/heures/supermarche/standards
// Met à jour uniquement les horaires standards (jours de la semaine)
router.put('/supermarche/standards', auth, async (req, res) => {
  try {
    if (req.user.role !== 'supermarche') {
      return res.status(403).json({ 
        success: false, 
        message: 'Accès réservé à l\'administrateur du supermarché' 
      });
    }

    const { jours } = req.body;

    if (!Array.isArray(jours) || jours.length !== 7) {
      return res.status(400).json({ 
        success: false, 
        message: 'Un tableau de 7 jours est requis' 
      });
    }

    let heure = await Heure.findOne();
    if (!heure) {
      heure = new Heure();
    }

    heure.jour = jours; // on remplace complètement le tableau jour

    await heure.save();

    res.json({ 
      success: true, 
      message: 'Horaires standards du supermarché mis à jour' 
    });
  } catch (err) {
    console.error('[PUT /heures/supermarche/standards] Erreur :', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PUT /api/heures/supermarche/exceptions
// Met à jour uniquement les exceptions
router.put('/supermarche/exceptions', auth, async (req, res) => {
  try {
    if (req.user.role !== 'supermarche') {
      return res.status(403).json({ 
        success: false, 
        message: 'Accès réservé à l\'administrateur du supermarché' 
      });
    }

    const { exceptions } = req.body;

    let heure = await Heure.findOne();
    if (!heure) {
      heure = new Heure();
    }

    heure.exceptions = exceptions || [];

    await heure.save();

    res.json({ 
      success: true, 
      message: 'Exceptions du supermarché mises à jour' 
    });
  } catch (err) {
    console.error('[PUT /heures/supermarche/exceptions] Erreur :', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ────────────────────────────────────────────────
// BOUTIQUES
// ────────────────────────────────────────────────

// GET /api/heures/boutique/me
// Récupère les horaires de la boutique connectée (plus sécurisé que /:id)
router.get('/boutique/me', auth, async (req, res) => {
  try {
    if (req.user.role !== 'boutique') {
      return res.status(403).json({ 
        success: false, 
        message: 'Accès réservé aux boutiques' 
      });
    }

    let heureB = await HeureBoutique.findOne({ idBoutique: req.user.id });

    if (!heureB) {
      heureB = new HeureBoutique({
        idBoutique: req.user.id,
        heures: [],
        exceptions: []
      });
      await heureB.save();
    }

    res.json({ success: true, data: heureB });
  } catch (err) {
    console.error('[GET /heures/boutique/me] Erreur :', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PUT /api/heures/boutique/me
// Met à jour les horaires standards de la boutique connectée
router.put('/boutique/me', auth, async (req, res) => {
  try {
    if (req.user.role !== 'boutique') {
      return res.status(403).json({ 
        success: false, 
        message: 'Accès réservé aux boutiques' 
      });
    }

    const { heures } = req.body;

    if (!Array.isArray(heures)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Un tableau "heures" est requis' 
      });
    }

    let heureB = await HeureBoutique.findOne({ idBoutique: req.user.id });

    if (!heureB) {
      heureB = new HeureBoutique({ idBoutique: req.user.id });
    }

    heureB.heures = heures;

    await heureB.save();

    res.json({ 
      success: true, 
      message: 'Vos horaires ont été mis à jour' 
    });
  } catch (err) {
    console.error('[PUT /heures/boutique/me] Erreur :', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;