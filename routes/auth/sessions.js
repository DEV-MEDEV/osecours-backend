// routes/auth/sessions.js
const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const ApiResponse = require('../../services/ApiResponse');
const Logger = require('../../services/Logger');
const TokenService = require('../../services/TokenService');
const { authenticate } = require('../../middleware/authMiddleware');

/**
 * Route pour récupérer la liste des sessions actives de l'utilisateur
 * @route GET /auth/sessions
 */
router.get('/',
    authenticate(),
    async (req, res) => {
        try {
            const { user, token } = req;
            const clientIp = req.ip || req.connection.remoteAddress;

            // Récupération de tous les tokens actifs de l'utilisateur
            const activeSessions = await prisma.token.findMany({
                where: {
                    userId: user.id,
                    isRevoked: false,
                    expiresAt: {
                        gt: new Date() // Tokens non expirés
                    }
                },
                select: {
                    id: true,
                    token: true,
                    type: true,
                    createdAt: true,
                    expiresAt: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            // Formatage des données de session
            const sessions = activeSessions.map(session => {
                const isCurrent = session.token === token;

                return {
                    id: session.id,
                    type: session.type,
                    createdAt: session.createdAt,
                    expiresAt: session.expiresAt,
                    isCurrent: isCurrent,
                    // Informations simplifiées (on pourrait enrichir avec device info)
                    deviceInfo: isCurrent ? 'Appareil actuel' : 'Autre appareil'
                };
            });

            // Séparation des types de tokens
            const accessTokens = sessions.filter(s => s.type === 'ACCESS');
            const refreshTokens = sessions.filter(s => s.type === 'REFRESH');

            // Log de consultation
            await Logger.logEvent({
                message: `Consultation des sessions pour l'utilisateur: ${user.email}`,
                source: 'auth/sessions',
                userId: user.id,
                action: 'SESSIONS_VIEWED',
                ipAddress: clientIp,
                requestData: {
                    totalSessions: sessions.length,
                    accessTokens: accessTokens.length,
                    refreshTokens: refreshTokens.length
                },
                status: 'SUCCESS'
            });

            return ApiResponse.success(res, 'Sessions actives récupérées', {
                sessions: {
                    accessTokens: accessTokens,
                    refreshTokens: refreshTokens,
                    total: sessions.length
                },
                summary: {
                    totalActiveSessions: sessions.length,
                    accessTokensCount: accessTokens.length,
                    refreshTokensCount: refreshTokens.length
                }
            });

        } catch (error) {
            await Logger.logEvent({
                message: `Erreur lors de la récupération des sessions: ${error.message}`,
                source: 'auth/sessions',
                userId: req.user?.id,
                action: 'SESSIONS_VIEW_ERROR',
                status: 'ERROR'
            });

            console.error('Erreur lors de la récupération des sessions:', error);
            return ApiResponse.serverError(res, 'Erreur interne du serveur');
        }
    }
);

/**
 * Route pour supprimer une session spécifique
 * @route DELETE /auth/sessions/:id
 */
router.delete('/:id',
    authenticate(),
    async (req, res) => {
        try {
            const { user, token } = req;
            const sessionId = parseInt(req.params.id);
            const clientIp = req.ip || req.connection.remoteAddress;

            // Validation de l'ID de session
            if (isNaN(sessionId)) {
                return ApiResponse.badRequest(res, 'ID de session invalide');
            }

            // Vérification que la session appartient à l'utilisateur
            const sessionToDelete = await prisma.token.findFirst({
                where: {
                    id: sessionId,
                    userId: user.id,
                    isRevoked: false
                }
            });

            if (!sessionToDelete) {
                await Logger.logEvent({
                    message: `Tentative de suppression d'une session inexistante ou non autorisée: ${sessionId}`,
                    source: 'auth/sessions',
                    userId: user.id,
                    action: 'SESSION_DELETE_FAILED',
                    ipAddress: clientIp,
                    requestData: { sessionId },
                    status: 'FAILED'
                });
                return ApiResponse.notFound(res, 'Session non trouvée ou non autorisée');
            }

            // Vérification pour empêcher la suppression de la session actuelle
            if (sessionToDelete.token === token) {
                return ApiResponse.badRequest(res, 'Impossible de supprimer la session actuelle. Utilisez /logout pour vous déconnecter.');
            }

            // Révocation de la session
            const revoked = await TokenService.revokeToken(sessionToDelete.token);
            if (!revoked) {
                return ApiResponse.serverError(res, 'Erreur lors de la suppression de la session');
            }

            // Log de suppression réussie
            await Logger.logEvent({
                message: `Session supprimée avec succès: ${sessionId} pour l'utilisateur: ${user.email}`,
                source: 'auth/sessions',
                userId: user.id,
                action: 'SESSION_DELETED',
                ipAddress: clientIp,
                requestData: {
                    sessionId,
                    sessionType: sessionToDelete.type,
                    sessionCreatedAt: sessionToDelete.createdAt
                },
                status: 'SUCCESS'
            });

            return ApiResponse.success(res, 'Session supprimée avec succès', {
                deletedSession: {
                    id: sessionId,
                    type: sessionToDelete.type,
                    createdAt: sessionToDelete.createdAt
                }
            });

        } catch (error) {
            await Logger.logEvent({
                message: `Erreur lors de la suppression de session: ${error.message}`,
                source: 'auth/sessions',
                userId: req.user?.id,
                action: 'SESSION_DELETE_ERROR',
                status: 'ERROR'
            });

            console.error('Erreur lors de la suppression de session:', error);
            return ApiResponse.serverError(res, 'Erreur interne du serveur');
        }
    }
);

module.exports = router;