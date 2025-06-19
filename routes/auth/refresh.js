// routes/auth/refresh.js
const express = require('express');
const router = express.Router();
const TokenService = require('../../services/TokenService');
const ApiResponse = require('../../services/ApiResponse');
const Logger = require('../../services/Logger');
const BodyFilter = require('../../middleware/bodyFilterMiddleware');
const prisma = require('../../prisma/client');

// Schéma de validation pour cette route
const bodySchema = {
    required: ['refreshToken'],
    allowed: ['refreshToken'],
    strict: true
};

/**
 * Route de renouvellement du token d'accès
 * @route POST /auth/refresh
 */
router.post('/',
    BodyFilter.filter(bodySchema),
    async (req, res) => {
        try {
            const { refreshToken } = req.body;
            const clientIp = req.ip || req.connection.remoteAddress;

            // Vérification de la validité du refresh token
            const tokenCheck = TokenService.checkToken(refreshToken);
            if (!tokenCheck.isValid) {
                await Logger.logEvent({
                    message: `Tentative de refresh avec token invalide`,
                    source: 'auth/refresh',
                    action: 'REFRESH_FAILED',
                    ipAddress: clientIp,
                    requestData: { reason: tokenCheck.message },
                    status: 'FAILED'
                });
                return ApiResponse.unauthorized(res, tokenCheck.message || 'Refresh token invalide');
            }

            // Vérification du type de token
            if (tokenCheck.payload.type !== 'REFRESH') {
                await Logger.logEvent({
                    message: `Tentative de refresh avec un token qui n'est pas un refresh token`,
                    source: 'auth/refresh',
                    userId: tokenCheck.payload.userId,
                    action: 'REFRESH_FAILED',
                    ipAddress: clientIp,
                    status: 'FAILED'
                });
                return ApiResponse.unauthorized(res, 'Type de token invalide');
            }

            // Vérification si le refresh token est révoqué
            const isRevoked = await TokenService.isTokenRevoked(refreshToken);
            if (isRevoked) {
                await Logger.logEvent({
                    message: `Tentative de refresh avec token révoqué`,
                    source: 'auth/refresh',
                    userId: tokenCheck.payload.userId,
                    action: 'REFRESH_FAILED',
                    ipAddress: clientIp,
                    status: 'FAILED'
                });
                return ApiResponse.unauthorized(res, 'Refresh token révoqué, veuillez vous reconnecter');
            }

            // Récupération des informations utilisateur
            const user = await prisma.user.findUnique({
                where: {
                    id: tokenCheck.payload.userId,
                    isActive: true,
                    deletedAt: null
                }
            });

            if (!user) {
                await Logger.logEvent({
                    message: `Refresh token valide mais utilisateur inexistant ou inactif`,
                    source: 'auth/refresh',
                    userId: tokenCheck.payload.userId,
                    action: 'REFRESH_FAILED',
                    ipAddress: clientIp,
                    status: 'FAILED'
                });
                return ApiResponse.unauthorized(res, 'Utilisateur non trouvé ou inactif');
            }

            // Vérification que l'utilisateur peut utiliser les refresh tokens
            if (user.role === 'ADMIN') {
                await Logger.logEvent({
                    message: `Tentative de refresh par un ADMIN (non autorisé)`,
                    source: 'auth/refresh',
                    userId: user.id,
                    action: 'REFRESH_FAILED',
                    ipAddress: clientIp,
                    status: 'FAILED'
                });
                return ApiResponse.unauthorized(res, 'Les administrateurs ne peuvent pas utiliser les refresh tokens');
            }

            // Génération d'un nouveau access token
            const newAccessToken = await TokenService.generateToken(user);

            // Optionnel : Génération d'un nouveau refresh token (rotation)
            const newRefreshToken = await TokenService.generateRefreshToken(user);

            // Révocation de l'ancien refresh token
            await TokenService.revokeToken(refreshToken);

            // Log de refresh réussi
            await Logger.logEvent({
                message: `Refresh token réussi pour l'utilisateur: ${user.email}`,
                source: 'auth/refresh',
                userId: user.id,
                action: 'REFRESH_SUCCESS',
                ipAddress: clientIp,
                status: 'SUCCESS'
            });

            // Réponse de succès
            return ApiResponse.success(res, 'Token renouvelé avec succès', {
                tokens: {
                    accessToken: newAccessToken,
                    refreshToken: newRefreshToken
                }
            });

        } catch (error) {
            // Log d'erreur
            await Logger.logEvent({
                message: `Erreur lors du refresh: ${error.message}`,
                source: 'auth/refresh',
                action: 'REFRESH_ERROR',
                status: 'ERROR'
            });

            console.error('Erreur lors du refresh:', error);
            return ApiResponse.serverError(res, 'Erreur interne du serveur');
        }
    }
);

module.exports = router;