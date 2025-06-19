// middleware/bodyFilterMiddleware.js
const ApiResponse = require('../services/ApiResponse');

/**
 * Middleware de filtrage et validation des champs du body
 */
class BodyFilter {

    /**
     * Crée un middleware de filtrage avec le schéma fourni
     * @param {Object} schema - Configuration des champs
     * @param {Array} schema.required - Champs obligatoires
     * @param {Array} schema.allowed - Champs autorisés
     * @param {boolean} schema.strict - Mode strict (par défaut true)
     * @returns {Function} Middleware Express
     */
    static filter(schema) {
        return (req, res, next) => {
            try {
                if (!req.body || typeof req.body !== 'object') {
                    req.body = {};
                }

                const { required = [], allowed = [], strict = true } = schema;
                const bodyKeys = Object.keys(req.body);

                // Vérification des champs manquants
                const missingFields = required.filter(field =>
                    !(field in req.body) ||
                    req.body[field] === null ||
                    req.body[field] === undefined ||
                    req.body[field] === ''
                );

                if (missingFields.length > 0) {
                    return ApiResponse.badRequest(res, 'Champs manquants', {
                        missingFields,
                        message: `Les champs suivants sont obligatoires: ${missingFields.join(', ')}`
                    });
                }

                // Vérification des champs non autorisés (mode strict)
                if (strict && allowed.length > 0) {
                    const unauthorizedFields = bodyKeys.filter(field => !allowed.includes(field));

                    if (unauthorizedFields.length > 0) {
                        return ApiResponse.badRequest(res, 'Champs non autorisés', {
                            unauthorizedFields,
                            allowedFields: allowed,
                            message: `Les champs suivants ne sont pas autorisés: ${unauthorizedFields.join(', ')}`
                        });
                    }
                }

                // Filtrage du body (suppression des champs non autorisés en mode non-strict)
                if (!strict && allowed.length > 0) {
                    const filteredBody = {};
                    allowed.forEach(field => {
                        if (field in req.body) {
                            filteredBody[field] = req.body[field];
                        }
                    });
                    req.body = filteredBody;
                }

                // Ajout d'informations de validation dans req
                req.validation = {
                    receivedFields: bodyKeys,
                    requiredFields: required,
                    allowedFields: allowed,
                    isValid: true
                };

                next();

            } catch (error) {
                console.error('Erreur dans bodyFilterMiddleware:', error);
                return ApiResponse.serverError(res, 'Erreur de validation des données');
            }
        };
    }
}

module.exports = BodyFilter;