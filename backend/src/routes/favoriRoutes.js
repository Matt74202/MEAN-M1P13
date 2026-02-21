const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/favoriController');

router.get ('/ids',            ctrl.getIdsFavorisClient);
router.post('/',               ctrl.toggleFavori);
router.get ('/:clientId',      ctrl.getFavorisClient);

module.exports = router;

