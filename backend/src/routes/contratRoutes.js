const express = require('express');
const router = express.Router();
const contratController = require('../controllers/contratController');

// Routes CRUD pour Contrat
router.post('/', contratController.createContrat);
router.get('/', contratController.getAllContrats);
router.get('/:id', contratController.getContratById);
router.put('/:id', contratController.updateContrat);
router.delete('/:id', contratController.deleteContrat);

module.exports = router;