const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/carteFideliteController');

router.get('/boutique/:boutiqueId',    ctrl.getCarteBoutique);
router.put('/boutique/:boutiqueId',    ctrl.updateCarte);
router.delete('/boutique/:boutiqueId', ctrl.desactiverCarte);

module.exports = router;