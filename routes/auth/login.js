// routes/auth/login.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');
const prisma = require('../../prisma/client');
const TokenService = require('../../services/TokenService');
const ApiResponse = require('../../services/ApiResponse');
const Logger = require('../../services/Logger');
const BodyFilter = require('../../middleware/bodyFilterMiddleware');
const { loginValidator } = require('../../validators/authValidator');

// Schéma de validation pour cette route
const bodySchema = {
    required: ['email', 'password'],
    allowed: ['email', 'password'],
    strict: true
};

/**
 * Route d'authentification unifiée pour tous les rôles (CITIZEN, RESCUE_MEMBER, ADMIN)
 * @route POST /auth/login
 */
router.post('/',
    BodyFilter.filter(bodySchema),   // Utilisation du schéma local
    loginValidator,                  // Validation des données
    async (req, res) => {
        try {
            // Validation des données d'entrée
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ApiResponse.badRequest(res, 'Données invalides', errors.array());
            }

            const { email, password } = req.body;
            const clientIp = req.ip || req.connection.remoteAddress;

            // Recherche de l'utilisateur avec ses relations
            const user = await prisma.user.findUnique({
                where: {
                    email: email.toLowerCase(),
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

            // Vérification existence utilisateur
            if (!user) {
                await Logger.logEvent({
                    message: `Tentative de connexion avec email inexistant: ${email}`,
                    source: 'auth/login',
                    action: 'LOGIN_FAILED',
                    ipAddress: clientIp,
                    status: 'FAILED'
                });
                return ApiResponse.unauthorized(res, 'Email ou mot de passe incorrect');
            }

            // Vérification du mot de passe
            const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
            if (!isPasswordValid) {
                await Logger.logEvent({
                    message: `Tentative de connexion avec mot de passe incorrect pour: ${email}`,
                    source: 'auth/login',
                    userId: user.id,
                    action: 'LOGIN_FAILED',
                    ipAddress: clientIp,
                    status: 'FAILED'
                });
                return ApiResponse.unauthorized(res, 'Email ou mot de passe incorrect');
            }

            // Génération des tokens
            const accessToken = await TokenService.generateToken(user);
            const refreshToken = await TokenService.generateRefreshToken(user);

            // Préparation des données utilisateur
            const userData = {
                id: user.id,
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName
            };

            // Ajout des données contextuelles selon le rôle
            let context = {};

            if (user.role === 'RESCUE_MEMBER' && user.rescueMember) {
                context = {
                    rescueService: {
                        id: user.rescueMember.rescueService.id,
                        name: user.rescueMember.rescueService.name,
                        serviceType: user.rescueMember.rescueService.serviceType
                    },
                    position: user.rescueMember.position,
                    badgeNumber: user.rescueMember.badgeNumber,
                    isOnDuty: user.rescueMember.isOnDuty
                };
            } else if (user.role === 'ADMIN' && user.adminRights) {
                context = {
                    permissions: user.adminRights.permissions,
                    isActive: user.adminRights.isActive
                };
            } else if (user.role === 'CITIZEN') {
                context = {
                    hasCompletedProfile: !!(user.phoneNumber && user.firstName && user.lastName)
                };
            }

            // Log de connexion réussie
            await Logger.logEvent({
                message: `Connexion réussie pour ${user.role}: ${email}`,
                source: 'auth/login',
                userId: user.id,
                action: 'LOGIN_SUCCESS',
                ipAddress: clientIp,
                status: 'SUCCESS'
            });

            // Réponse de succès
            return ApiResponse.success(res, 'Connexion réussie', {
                user: userData,
                tokens: {
                    accessToken,
                    refreshToken
                },
                context
            });

        } catch (error) {
            // Log d'erreur
            await Logger.logEvent({
                message: `Erreur lors de la connexion: ${error.message}`,
                source: 'auth/login',
                action: 'LOGIN_ERROR',
                status: 'ERROR'
            });

            console.error('Erreur lors de la connexion:', error);
            return ApiResponse.serverError(res, 'Erreur interne du serveur');
        }
    }
);

module.exports = router;