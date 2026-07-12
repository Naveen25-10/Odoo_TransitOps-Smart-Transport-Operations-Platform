const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.get('/dashboard', reportController.getDashboard);
router.get('/monthly', reportController.getMonthly);
router.get('/roi', reportController.getRoi); // Changed from top-cost to roi

module.exports = router;
