const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/panierController');

router.get   ('/:clientId',                        ctrl.getPanier);
router.post  ('/:clientId/articles',               ctrl.ajouterArticle);
router.put   ('/:clientId/articles',               ctrl.modifierQuantite);
router.delete('/:clientId/articles/:idProduit',    ctrl.supprimerArticle);
router.delete('/:clientId/vider',                  ctrl.viderPanier);

module.exports = router;