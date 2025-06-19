// routes/auth/otp.js
const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const ApiResponse = require('../../services/ApiResponse');
const Logger = require('../../services/Logger');
const SmsService = require('../../services/SmsService');
const BodyFilter = require('../../middleware/bodyFilterMiddleware');
const Consts = require('../../config/const');

// Schéma pour demande OTP
const otpRequestSchema = {
    required: ['phoneNumber'],
    allowed: ['phoneNumber'],
    strict: true
};

// Schéma pour vérification OTP
const otpVerifySchema = {
    required: ['phoneNumber', 'otp'],
    allowed: ['phoneNumber', 'otp'],
    strict: true
};

/**
 * Route de demande d'OTP par SMS
 * @route POST /auth/otp-request
 */
router.post('/request',
    BodyFilter.filter(otpRequestSchema),
    async (req, res) => {
        try {
            const { phoneNumber } = req.body;
            const clientIp = req.ip || req.connection.remoteAddress;

            // Nettoyage du numéro de téléphone
            const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');

            // Validation du format
            if (cleanPhone.length < 8 || cleanPhone.length > 10) {
                return ApiResponse.badRequest(res, 'Numéro de téléphone invalide');
            }

            // Soft delete des anciens OTP pour ce numéro
            await prisma.citizenOtp.updateMany({
                where: {
                    phoneNumber: cleanPhone,
                    deletedAt: null
                },
                data: {
                    deletedAt: new Date(),
                    deletedBy: 'SYSTEM_NEW_REQUEST'
                }
            });

            // Génération de l'OTP
            const otp = SmsService.generateOtp();
            const expiresAt = new Date(Date.now() + (Consts.OTP_CONFIG.expirationMinutes * 60 * 1000));

            // Sauvegarde du nouvel OTP
            await prisma.citizenOtp.create({
                data: {
                    phoneNumber: cleanPhone,
                    otp: otp,
                    expiresAt: expiresAt
                }
            });

            // Envoi du SMS
            const smsResult = await SmsService.sendOtp(cleanPhone, otp);

            if (!smsResult.success) {
                // Soft delete de l'OTP en cas d'échec d'envoi
                await prisma.citizenOtp.updateMany({
                    where: {
                        phoneNumber: cleanPhone,
                        deletedAt: null
                    },
                    data: {
                        deletedAt: new Date(),
                        deletedBy: 'SYSTEM_SMS_FAILED'
                    }
                });

                await Logger.logEvent({
                    message: `Échec d'envoi OTP pour ${cleanPhone}: ${smsResult.message}`,
                    source: 'auth/otp',
                    action: 'OTP_SEND_FAILED',
                    ipAddress: clientIp,
                    requestData: { phoneNumber: cleanPhone },
                    status: 'FAILED'
                });

                return ApiResponse.serverError(res, 'Erreur lors de l\'envoi du SMS');
            }

            // Log de succès
            await Logger.logEvent({
                message: `OTP envoyé avec succès au ${cleanPhone}`,
                source: 'auth/otp',
                action: 'OTP_SENT',
                ipAddress: clientIp,
                requestData: { phoneNumber: cleanPhone },
                status: 'SUCCESS'
            });

            return ApiResponse.success(res, 'Code de vérification envoyé par SMS', {
                phoneNumber: cleanPhone,
                expiresIn: `${Consts.OTP_CONFIG.expirationMinutes} minutes`
            });

        } catch (error) {
            await Logger.logEvent({
                message: `Erreur lors de la demande OTP: ${error.message}`,
                source: 'auth/otp',
                action: 'OTP_REQUEST_ERROR',
                status: 'ERROR'
            });

            console.error('Erreur lors de la demande OTP:', error);
            return ApiResponse.serverError(res, 'Erreur interne du serveur');
        }
    }
);

/**
 * Route de vérification d'OTP avec gestion robuste
 * @route POST /auth/verify-otp
 */
router.post('/verify',
    BodyFilter.filter(otpVerifySchema),
    async (req, res) => {
        try {
            const { phoneNumber, otp } = req.body;
            const clientIp = req.ip || req.connection.remoteAddress;

            // Nettoyage du numéro
            const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');

            // Recherche de l'OTP actif (non supprimé)
            const otpRecord = await prisma.citizenOtp.findFirst({
                where: {
                    phoneNumber: cleanPhone,
                    deletedAt: null  // Seulement les OTP non supprimés
                }
            });

            if (!otpRecord) {
                // Vérifier s'il y a un OTP déjà utilisé
                const usedOtp = await prisma.citizenOtp.findFirst({
                    where: {
                        phoneNumber: cleanPhone,
                        deletedAt: { not: null }
                    },
                    orderBy: { createdAt: 'desc' }
                });

                if (usedOtp) {
                    await Logger.logEvent({
                        message: `Tentative d'utilisation d'un OTP déjà validé pour ${cleanPhone}`,
                        source: 'auth/otp',
                        action: 'OTP_ALREADY_USED',
                        ipAddress: clientIp,
                        requestData: { phoneNumber: cleanPhone },
                        status: 'FAILED'
                    });
                    return ApiResponse.badRequest(res, 'Ce code a déjà été utilisé. Demandez un nouveau code de vérification.');
                }

                await Logger.logEvent({
                    message: `Tentative de vérification OTP inexistant pour ${cleanPhone}`,
                    source: 'auth/otp',
                    action: 'OTP_NOT_FOUND',
                    ipAddress: clientIp,
                    requestData: { phoneNumber: cleanPhone },
                    status: 'FAILED'
                });
                return ApiResponse.badRequest(res, 'Code de vérification introuvable. Demandez un nouveau code.');
            }

            // Vérification de l'expiration
            if (new Date() > otpRecord.expiresAt) {
                // Marquer comme supprimé (expiré)
                await prisma.citizenOtp.update({
                    where: { id: otpRecord.id },
                    data: {
                        deletedAt: new Date(),
                        deletedBy: 'SYSTEM_EXPIRED'
                    }
                });
                return ApiResponse.badRequest(res, 'Code de vérification expiré. Demandez un nouveau code.');
            }

            // Vérification du code
            if (otpRecord.otp !== otp) {
                await Logger.logEvent({
                    message: `Code OTP incorrect pour ${cleanPhone}`,
                    source: 'auth/otp',
                    action: 'OTP_INVALID',
                    ipAddress: clientIp,
                    requestData: { phoneNumber: cleanPhone },
                    status: 'FAILED'
                });
                return ApiResponse.badRequest(res, 'Code de vérification incorrect');
            }

            // ✅ OTP VALIDÉ - Marquer comme utilisé via soft delete
            await prisma.citizenOtp.update({
                where: { id: otpRecord.id },
                data: {
                    deletedAt: new Date(),
                    deletedBy: 'USER_VERIFIED'
                }
            });

            // Log de vérification réussie
            await Logger.logEvent({
                message: `Vérification OTP réussie pour ${cleanPhone}`,
                source: 'auth/otp',
                action: 'OTP_VERIFIED',
                ipAddress: clientIp,
                requestData: { phoneNumber: cleanPhone },
                status: 'SUCCESS'
            });

            return ApiResponse.success(res, 'Code de vérification validé avec succès', {
                phoneNumber: cleanPhone,
                validated: true
            });

        } catch (error) {
            await Logger.logEvent({
                message: `Erreur lors de la vérification OTP: ${error.message}`,
                source: 'auth/otp',
                action: 'OTP_VERIFY_ERROR',
                status: 'ERROR'
            });

            console.error('Erreur lors de la vérification OTP:', error);
            return ApiResponse.serverError(res, 'Erreur interne du serveur');
        }
    }
);

module.exports = router;