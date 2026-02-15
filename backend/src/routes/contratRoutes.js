const express = require('express');
const router = express.Router();
const {
  createContrat,
  getAllContrats,
  getContratById,
  updateContrat,
  deleteContrat
} = require('../controllers/contratController');

const validateObjectId = require('../middlewares/validateObjectId');

router.route('/')
  .post(createContrat)
  .get(getAllContrats);

router.route('/:id')
  .get(validateObjectId, getContratById)
  .put(validateObjectId, updateContrat)
  .delete(validateObjectId, deleteContrat);

module.exports = router;