const express = require('express');
const router = express.Router();
router.get('/data/anarchyvn/:data/:username', require('../controllers/data'));
// router.get('/test', require('../controllers/test'));
module.exports = router;