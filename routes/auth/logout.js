// routes/auth/logout.js
const express = require('express');
const router = express.Router();
const TokenService = require('../../services/TokenService');
const ApiResponse = require('../../services/ApiResponse');
const Logger = require('../../services/Logger');
const { authenticate } = require('../../middleware/authMiddleware');

/**
 * Route de déconnexion - révoque le token actuel
 * @route POST /auth/logout
 */
router.post('/',
    authenticate(),
    async (req, res) => {
        try {
            const { user, token } = req;
            const clientIp = req.ip || req.connection.remoteAddress;

            // Révocation du token
            const revoked = await TokenService.revokeToken(token);
            if (!revoked) {
                return ApiResponse.serverError(res, 'Erreur lors de la déconnexion');
            }

            // Log de déconnexion
            await Logger.logEvent({
                message: `Déconnexion réussie pour l'utilisateur: ${user.email}`,
                source: 'auth/logout',
                userId: user.id,
                action: 'LOGOUT_SUCCESS',
                ipAddress: clientIp,
                status: 'SUCCESS'
            });

            return ApiResponse.success(res, 'Déconnexion réussie');

        } catch (error) {
            // Log d'erreur
            await Logger.logEvent({
                message: `Erreur lors de la déconnexion: ${error.message}`,
                source: 'auth/logout',
                userId: req.user?.id,
                action: 'LOGOUT_ERROR',
                status: 'ERROR'
            });

            console.error('Erreur lors de la déconnexion:', error);
            return ApiResponse.serverError(res, 'Erreur interne du serveur');
        }
    }
);

/**
 * Route de déconnexion de toutes les sessions - révoque tous les tokens de l'utilisateur
 * @route DELETE /auth/logout/all
 */
router.delete('/all',
    authenticate(),
    async (req, res) => {
        try {
            const { user } = req;
            const clientIp = req.ip || req.connection.remoteAddress;

            // Révocation de tous les tokens de l'utilisateur
            const revoked = await TokenService.revokeAllUserTokens(user.id);
            if (!revoked) {
                return ApiResponse.serverError(res, 'Erreur lors de la déconnexion de toutes les sessions');
            }

            // Log de déconnexion globale
            await Logger.logEvent({
                message: `Déconnexion de toutes les sessions pour l'utilisateur: ${user.email}`,
                source: 'auth/logout',
                userId: user.id,
                action: 'LOGOUT_ALL_SUCCESS',
                ipAddress: clientIp,
                status: 'SUCCESS'
            });

            return ApiResponse.success(res, 'Déconnexion de toutes les sessions réussie');

        } catch (error) {
            // Log d'erreur
            await Logger.logEvent({
                message: `Erreur lors de la déconnexion globale: ${error.message}`,
                source: 'auth/logout',
                userId: req.user?.id,
                action: 'LOGOUT_ALL_ERROR',
                status: 'ERROR'
            });

            console.error('Erreur lors de la déconnexion globale:', error);
            return ApiResponse.serverError(res, 'Erreur interne du serveur');
        }
    }
);

module.exports = router;