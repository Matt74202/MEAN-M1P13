const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/stockController');

router.post  ('/entree',              ctrl.entreeStock);
router.get   ('/historique',          ctrl.getHistorique);
router.post('/sortie',              ctrl.sortieStockManuelle); 
router.get   ('/boutique/:boutiqueId', ctrl.getStockBoutique);

module.exports = router;

