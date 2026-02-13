const express = require('express');
const router = express.Router();
const {
  createBox,
  getAllBoxes,
  getBoxById,
  updateBox,
  deleteBox,
} = require('../controllers/boxController');
const validateObjectId = require('../middlewares/validateObjectId');

router.route('/')
  .post(createBox)
  .get(getAllBoxes);

router.route('/:id')
  .get(validateObjectId, getBoxById)
  .put(validateObjectId, updateBox)
  .delete(validateObjectId, deleteBox);

module.exports = router;