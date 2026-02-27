const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/promotionController');

router.post('/',                          ctrl.creerPromotion);
router.get('/boutique/:boutiqueId',       ctrl.getPromotionsBoutique);
router.get('/boutique/:boutiqueId/actives', ctrl.getPromotionsActives);
router.put('/:id',                        ctrl.modifierPromotion);
router.delete('/:id',                     ctrl.supprimerPromotion);

module.exports = router;