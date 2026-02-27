const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/dashboardController');

router.get('/boutique/:boutiqueId', ctrl.getDashboardBoutique);

module.exports = router;

