const express = require('express');
const router = express.Router();
const fuelController = require('../controllers/fuelController');

router.get('/', fuelController.getFuelLogs);
router.post('/', fuelController.addFuelLog);

module.exports = router;
