// routes/citizen/register.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');
const prisma = require('../../prisma/client');
const ApiResponse = require('../../services/ApiResponse');
const Logger = require('../../services/Logger');
const TokenService = require('../../services/TokenService');
const BodyFilter = require('../../middleware/bodyFilterMiddleware');
const { registerValidator } = require('../../validators/citizenValidator');

// Schéma de validation pour cette route
const bodySchema = {
    required: ['nom', 'email', 'password', 'numero'],
    allowed: ['nom', 'email', 'password', 'numero'],
    strict: true
};

/**
 * Route d'inscription d'un nouveau citoyen
 * @route POST /citizen/register
 */
router.post('/',
    BodyFilter.filter(bodySchema),
    registerValidator,
    async (req, res) => {
        try {
            // Validation des données d'entrée
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ApiResponse.badRequest(res, 'Données d\'inscription invalides', errors.array());
            }

            const { nom, email, password, numero } = req.body;
            const clientIp = req.ip || req.connection.remoteAddress;

            // Nettoyage du numéro de téléphone
            const cleanPhone = numero.replace(/[^0-9]/g, '');

            // Vérification que le numéro a été validé par OTP
            const otpRecord = await prisma.citizenOtp.findUnique({
                where: { phoneNumber: cleanPhone }
            });

            if (!otpRecord) {
                await Logger.logEvent({
                    message: `Tentative d'inscription sans validation OTP pour ${cleanPhone}`,
                    source: 'citizen/register',
                    action: 'REGISTER_FAILED',
                    ipAddress: clientIp,
                    requestData: { phoneNumber: cleanPhone, email },
                    status: 'FAILED'
                });
                return ApiResponse.badRequest(res, 'Ce numéro doit être vérifié avec un code OTP avant l\'inscription');
            }

            // Vérification de l'expiration de l'OTP (sécurité supplémentaire)
            if (new Date() > otpRecord.expiresAt) {
                await prisma.citizenOtp.delete({
                    where: { id: otpRecord.id }
                });
                return ApiResponse.badRequest(res, 'La validation OTP a expiré, veuillez recommencer');
            }

            // Vérification de l'unicité de l'email
            const existingUserByEmail = await prisma.user.findFirst({
                where: {
                    email: email.toLowerCase(),
                    deletedAt: null
                }
            });

            if (existingUserByEmail) {
                await Logger.logEvent({
                    message: `Tentative d'inscription avec email déjà existant: ${email}`,
                    source: 'citizen/register',
                    action: 'REGISTER_FAILED',
                    ipAddress: clientIp,
                    requestData: { email, phoneNumber: cleanPhone },
                    status: 'FAILED'
                });
                return ApiResponse.badRequest(res, 'Email déjà utilisé');
            }

            // Vérification de l'unicité du numéro de téléphone
            const existingUserByPhone = await prisma.user.findFirst({
                where: {
                    phoneNumber: cleanPhone,
                    deletedAt: null
                }
            });

            if (existingUserByPhone) {
                await Logger.logEvent({
                    message: `Tentative d'inscription avec numéro déjà existant: ${cleanPhone}`,
                    source: 'citizen/register',
                    action: 'REGISTER_FAILED',
                    ipAddress: clientIp,
                    requestData: { email, phoneNumber: cleanPhone },
                    status: 'FAILED'
                });
                return ApiResponse.badRequest(res, 'Numéro de téléphone déjà utilisé');
            }

            // Hashage du mot de passe
            const passwordHash = await bcrypt.hash(password, 10);

            // Séparation du nom complet en prénom et nom
            const nameParts = nom.trim().split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ') || firstName; // Si un seul mot, utiliser pour les deux

            // Création de l'utilisateur citoyen
            const user = await prisma.user.create({
                data: {
                    email: email.toLowerCase(),
                    passwordHash: passwordHash,
                    phoneNumber: cleanPhone,
                    firstName: firstName,
                    lastName: lastName,
                    role: 'CITIZEN'
                }
            });

            // Génération des tokens
            const accessToken = await TokenService.generateToken(user);
            const refreshToken = await TokenService.generateRefreshToken(user);

            // Suppression de l'OTP utilisé
            await prisma.citizenOtp.delete({
                where: { id: otpRecord.id }
            });

            // Log de création réussie
            await Logger.logEvent({
                message: `Inscription réussie pour le citoyen: ${email}`,
                source: 'citizen/register',
                userId: user.id,
                action: 'CITIZEN_REGISTERED',
                ipAddress: clientIp,
                requestData: { email, phoneNumber: cleanPhone },
                status: 'SUCCESS'
            });

            // Réponse de succès
            return ApiResponse.created(res, 'Compte créé avec succès', {
                id: user.id,
                nom: `${user.firstName} ${user.lastName}`,
                email: user.email,
                tokens: {
                    accessToken,
                    refreshToken
                }
            });

        } catch (error) {
            // Log d'erreur
            await Logger.logEvent({
                message: `Erreur lors de l'inscription: ${error.message}`,
                source: 'citizen/register',
                action: 'REGISTER_ERROR',
                requestData: req.body,
                status: 'ERROR'
            });

            console.error('Erreur lors de l\'inscription:', error);
            return ApiResponse.serverError(res, 'Erreur lors de l\'inscription');
        }
    }
);

module.exports = router;