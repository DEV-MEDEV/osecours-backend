// routes/v1.js
const express = require('express');
const router = express.Router();

// Import des contrôleurs (modulaires)
const infoController = require('../controllers/InfoController');

// Ajout des sous-routes
router.use('/info', infoController);

// Swagger docs
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../config/swagger');
router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

module.exports = router;
