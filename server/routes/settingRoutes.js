const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');

router.get('/profile', settingController.getProfile);
router.put('/profile', settingController.updateProfile);
router.put('/password', settingController.updatePassword);
router.get('/roles', settingController.getRoles);

module.exports = router;
