// routes/v1.js
const express = require('express');
const router = express.Router();

// Import des contrôleurs (modulaires)
const infoController = require('../controllers/InfoController');
const authController = require('../controllers/AuthController');
const citizenController = require('../controllers/CitizenController');

// Ajout des sous-routes
router.use('/info', infoController);
router.use('/auth', authController);
router.use('/citizen', citizenController);

// Swagger docs
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../config/swagger');
router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

module.exports = router;