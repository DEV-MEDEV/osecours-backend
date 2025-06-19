// middleware/authMiddleware.js
const TokenService = require('../services/TokenService');
const ApiResponse = require('../services/ApiResponse');
const Logger = require('../services/Logger');
const prisma = require('../prisma/client');


/**
 * Middleware d'authentification et d'autorisation
 */
class AuthMiddleware {

    /**
     * Middleware d'authentification - vérifie la validité du token JWT
     * @returns {Function} Middleware Express
     */
    static authenticate() {
        return async (req, res, next) => {
            try {
                const authHeader = req.headers.authorization;
                const clientIp = req.ip || req.connection.remoteAddress;

                // Vérification de la présence du token
                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    return ApiResponse.unauthorized(res, 'Token d\'authentification requis');
                }

                const token = authHeader.substring(7); // Enlever "Bearer "

                // Vérification de la validité du token
                const tokenCheck = TokenService.checkToken(token);
                if (!tokenCheck.isValid) {
                    await Logger.logEvent({
                        message: `Tentative d'accès avec token invalide`,
                        source: 'authMiddleware',
                        action: 'AUTH_FAILED',
                        ipAddress: clientIp,
                        requestData: { reason: tokenCheck.message },
                        status: 'FAILED'
                    });
                    return ApiResponse.unauthorized(res, tokenCheck.message || 'Token invalide');
                }

                // Vérification si le token est révoqué
                const isRevoked = await TokenService.isTokenRevoked(token);
                if (isRevoked) {
                    await Logger.logEvent({
                        message: `Tentative d'accès avec token révoqué`,
                        source: 'authMiddleware',
                        userId: tokenCheck.payload.userId,
                        action: 'AUTH_FAILED',
                        ipAddress: clientIp,
                        status: 'FAILED'
                    });
                    return ApiResponse.unauthorized(res, 'Token révoqué, veuillez vous reconnecter');
                }

                // Récupération des informations utilisateur
                const user = await prisma.user.findUnique({
                    where: {
                        id: tokenCheck.payload.userId,
                        isActive: true,
                        deletedAt: null
                    },
                    include: {
                        rescueMember: {
                            include: {
                                rescueService: true
                            }
                        },
                        adminRights: true
                    }
                });

                if (!user) {
                    await Logger.logEvent({
                        message: `Token valide mais utilisateur inexistant ou inactif`,
                        source: 'authMiddleware',
                        userId: tokenCheck.payload.userId,
                        action: 'AUTH_FAILED',
                        ipAddress: clientIp,
                        status: 'FAILED'
                    });
                    return ApiResponse.unauthorized(res, 'Utilisateur non trouvé ou inactif');
                }

                // Ajout des informations utilisateur dans req
                req.user = user;
                req.token = token;

                next();

            } catch (error) {
                await Logger.logEvent({
                    message: `Erreur dans le middleware d'authentification: ${error.message}`,
                    source: 'authMiddleware',
                    action: 'AUTH_ERROR',
                    status: 'ERROR'
                });

                console.error('Erreur dans authMiddleware.authenticate:', error);
                return ApiResponse.serverError(res, 'Erreur d\'authentification');
            }
        };
    }

    /**
     * Middleware d'autorisation - vérifie les rôles autorisés
     * @param {Array|string} allowedRoles - Rôles autorisés (CITIZEN, RESCUE_MEMBER, ADMIN)
     * @returns {Function} Middleware Express
     */
    static authorize(allowedRoles) {
        return async (req, res, next) => {
            try {
                // Vérification que l'authentification a eu lieu
                if (!req.user) {
                    return ApiResponse.unauthorized(res, 'Authentification requise');
                }

                // Normalisation des rôles autorisés
                const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
                const userRole = req.user.role;
                const clientIp = req.ip || req.connection.remoteAddress;

                // Vérification du rôle
                if (!roles.includes(userRole)) {
                    await Logger.logEvent({
                        message: `Tentative d'accès non autorisé - Rôle: ${userRole}, Rôles requis: ${roles.join(', ')}`,
                        source: 'authMiddleware',
                        userId: req.user.id,
                        action: 'AUTHORIZATION_FAILED',
                        ipAddress: clientIp,
                        requestData: {
                            userRole,
                            requiredRoles: roles,
                            route: `${req.method} ${req.originalUrl}`
                        },
                        status: 'FAILED'
                    });
                    return ApiResponse.unauthorized(res, 'Accès refusé - Permissions insuffisantes');
                }

                next();

            } catch (error) {
                await Logger.logEvent({
                    message: `Erreur dans le middleware d'autorisation: ${error.message}`,
                    source: 'authMiddleware',
                    userId: req.user?.id,
                    action: 'AUTHORIZATION_ERROR',
                    status: 'ERROR'
                });

                console.error('Erreur dans authMiddleware.authorize:', error);
                return ApiResponse.serverError(res, 'Erreur d\'autorisation');
            }
        };
    }
}

module.exports = AuthMiddleware;