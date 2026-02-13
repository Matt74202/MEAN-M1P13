const express = require('express');
const router = express.Router();
const {
  createProduit,
  getAllProduits,
  getProduitById,
  updateProduit,
  deleteProduit
} = require('../controllers/produitController');

const validateObjectId = require('../middlewares/validateObjectId');

router.route('/')
  .post(createProduit)
  .get(getAllProduits);

router.route('/:id')
  .get(validateObjectId, getProduitById)
  .put(validateObjectId, updateProduit)
  .delete(validateObjectId, deleteProduit);

module.exports = router;