// controllers/InfoController.js
const express = require('express');
const router = express.Router();

const service = 'info';

// Import des routes
const infosRoute = require('../routes/' + service + '/infos');

// Utilisation des routes
router.use('/', infosRoute);

module.exports = router;
