const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/achatController');

router.post('/',                   ctrl.creerCommande);
router.get('/client/:clientId',    ctrl.getCommandesClient);
router.get ('/:clientId/en-attente', ctrl.getCommandesEnAttente);
router.patch('/:id/recue',           ctrl.marquerCommandeRecue);


module.exports = router;