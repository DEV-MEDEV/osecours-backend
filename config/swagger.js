require('dotenv').config();
const swaggerJsdoc = require('swagger-jsdoc');

const getServers = () => {
    const environment = process.env.NODE_ENV || 'development';
    const servers = [];

    switch (environment) {
        case 'production':
            servers.push({
                url: process.env.PROD_API_URL || 'https://api.osecours.com',
                description: 'Serveur de production'
            });
            break;
        case 'test':
            servers.push({
                url: process.env.TEST_API_URL || 'https://test-osecours.api-medev.com',
                description: 'Serveur de test'
            });
            break;
        default:
            servers.push({
                url: process.env.DEV_API_URL || 'http://localhost:3000',
                description: 'Serveur de développement'
            });
    }

    return servers;
};

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: "O'secours - API de coordination des secours",
            version: '1.0.0',
            description:
                "Documentation de l'API du système **O'secours**, développée par MEDEV GROUP. Cette API permet de gérer les utilisateurs, les alertes d'urgence, les membres des secours, les notifications et les interventions.",
            contact: {
                name: 'MEDEV GROUP',
                email: 'contact@medev.com'
            }
        },
        servers: getServers(),
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        },
        security: [
            {
                bearerAuth: []
            }
        ]
    },

    apis: [
        './swagger/infos/*.yaml',
        './swagger/auth/*.yaml',
      ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
