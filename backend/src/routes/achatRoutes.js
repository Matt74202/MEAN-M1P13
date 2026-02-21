const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/achatController');

router.post('/',                   ctrl.creerCommande);
router.get('/client/:clientId',    ctrl.getCommandesClient);


module.exports = router;