// controllers/CitizenController.js
const express = require('express');
const router = express.Router();

const service = 'citizen';

// Import des routes
const registerRoute = require('../routes/' + service + '/register');

// Utilisation des routes
router.use('/register', registerRoute);

module.exports = router;