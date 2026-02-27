const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/carteClientController');

router.get('/client/:clientId',      ctrl.getAllCartesClient);  
router.get('/simuler-reduction',     ctrl.simulerReduction);
router.get('/:clientId/:boutiqueId', ctrl.getCarteClient);

module.exports = router;