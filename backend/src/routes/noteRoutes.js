const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/noteController');

router.post('/boutique',                              ctrl.noterBoutique);
router.post('/produit',                               ctrl.noterProduit);
router.get ('/boutique/:boutiqueId/stats',            ctrl.getStatsBoutique);
router.get ('/produit/:produitId/stats',              ctrl.getStatsProduit);
router.get ('/boutique/:boutiqueId/produits/stats',   ctrl.getStatsProduitsBoutique);

module.exports = router;

