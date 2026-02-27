const express = require('express');
const router  = express.Router();

const {
  createRequest,
  getPendingRequests,
  getAllRequests,
  validateRequest,
  rejectRequest,
} = require('../controllers/rentalController');

router.post('/', createRequest);
router.get('/all',      getAllRequests); 
router.get('/pending', getPendingRequests);
router.put('/:id/validate', validateRequest);
router.put('/:id/reject', rejectRequest);

module.exports = router;