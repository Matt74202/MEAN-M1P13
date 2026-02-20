const express = require('express');
const router = express.Router();
const {
  createBoutique,
  getAllBoutiques,
  getBoutiqueById,
  updateBoutique,
  deleteBoutique
} = require('../controllers/boutiqueController');

const validateObjectId = require('../middlewares/validateObjectId');

router.route('/')
  .post(createBoutique)
  .get(getAllBoutiques);

router.route('/:id')
  .get(validateObjectId, getBoutiqueById)
  .put(validateObjectId, updateBoutique)
  .delete(validateObjectId, deleteBoutique);

module.exports = router;