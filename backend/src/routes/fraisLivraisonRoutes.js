const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/fraisLivraisonController');

router.get('/',   ctrl.getFrais);
router.put('/',   ctrl.updateFrais);

module.exports = router;