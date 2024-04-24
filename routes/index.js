var express = require('express');
const {getMaxChangedBalance} = require('../controllers');
var router = express.Router();

router.get('/', getMaxChangedBalance);

module.exports = router;
