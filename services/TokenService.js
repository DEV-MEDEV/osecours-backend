const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const Consts = require('../config/const');

class TokenService {
    /**
     * Génère un token d'accès JWT et l'enregistre en base.
     * @param {Object} user - L'utilisateur pour lequel générer le token.
     * @param {string} user.id - L'identifiant unique de l'utilisateur.
     * @param {string} user.role - Le rôle de l'utilisateur (ADMIN, RESCUE_MEMBER, CITIZEN).
     * @returns {Promise<string>} Le token JWT généré.
     */
    static async generateToken(user) {
        const payload = { userId: user.id, role: user.role };

        let expiresIn;
        switch (user.role) {
            case 'ADMIN':
            case 'RESCUE_MEMBER':
                expiresIn = '1d';
                break;
            case 'CITIZEN':
            default:
                expiresIn = '7d';
        }

        const token = jwt.sign(payload, Consts.JWT_SECRET, { expiresIn });
        const expiresAt = new Date(Date.now() + this._getExpirationMilliseconds(expiresIn));

        await prisma.token.create({
            data: {
                userId: user.id,
                token,
                type: 'ACCESS',
                isRevoked: false,
                expiresAt
            }
        });

        return token;
    }

    /**
     * Génère un token de rafraîchissement (REFRESH) pour l'utilisateur, sauf pour les admins.
     * @param {Object} user - L'utilisateur concerné.
     * @returns {Promise<string|null>} Le token de rafraîchissement ou null si non applicable.
     */
    static async generateRefreshToken(user) {
        if (user.role === 'ADMIN') return null;

        const payload = { userId: user.id, role: user.role, type: 'REFRESH' };
        const expiresIn = '30d';
        const token = jwt.sign(payload, Consts.JWT_SECRET, { expiresIn });

        const expiresAt = new Date(Date.now() + this._getExpirationMilliseconds(expiresIn));

        await prisma.token.create({
            data: {
                userId: user.id,
                token,
                type: 'REFRESH',
                isRevoked: false,
                expiresAt
            }
        });

        return token;
    }

    /**
     * Vérifie la validité d’un token JWT.
     * @param {string} token - Le token JWT à vérifier.
     * @returns {Object|null} Payload décodé si valide, sinon null.
     */
    static verifyToken(token) {
        try {
            return jwt.verify(token, Consts.JWT_SECRET);
        } catch {
            return null;
        }
    }

    /**
     * Vérifie et décode un token, avec traitement de l'expiration.
     * @param {string} token - Le token à analyser.
     * @returns {Object} Objet avec statut de validité, payload, et message d’erreur si applicable.
     */
    static checkToken(token) {
        try {
            const payload = jwt.verify(token, Consts.JWT_SECRET);
            return { isValid: true, payload };
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                const payload = jwt.decode(token);
                return {
                    isValid: false,
                    expired: true,
                    payload,
                    message: 'Le token a expiré, veuillez vous reconnecter.'
                };
            }

            return {
                isValid: false,
                message: 'Token invalide : ' + err.message
            };
        }
    }

    /**
     * Révoque un token (le marque comme invalide en base).
     * @param {string} token - Le token à révoquer.
     * @returns {Promise<boolean>} true si succès, false sinon.
     */
    static async revokeToken(token) {
        try {
            await prisma.token.updateMany({
                where: { token },
                data: { isRevoked: true }
            });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Révoque tous les tokens actifs d’un utilisateur.
     * @param {string} userId - ID de l’utilisateur.
     * @returns {Promise<boolean>} true si réussite, false sinon.
     */
    static async revokeAllUserTokens(userId) {
        try {
            await prisma.token.updateMany({
                where: { userId, isRevoked: false },
                data: { isRevoked: true }
            });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Vérifie si un token donné est révoqué.
     * @param {string} token - Token à vérifier.
     * @returns {Promise<boolean>} true si révoqué ou non trouvé, false sinon.
     */
    static async isTokenRevoked(token) {
        try {
            const record = await prisma.token.findUnique({ where: { token } });
            return !record || record.isRevoked;
        } catch {
            return true;
        }
    }

    /**
     * Convertit une durée (`1d`, `30m`, etc.) en millisecondes.
     * @private
     * @param {string} expiresIn - Durée lisible.
     * @returns {number} Durée en millisecondes.
     */
    static _getExpirationMilliseconds(expiresIn) {
        const match = expiresIn.match(/^(\d+)([smhdy])$/);
        if (!match) return 0;
        const [_, value, unit] = match;
        const multipliers = {
            s: 1000,
            m: 60 * 1000,
            h: 60 * 60 * 1000,
            d: 24 * 60 * 60 * 1000,
            y: 365 * 24 * 60 * 60 * 1000
        };
        return parseInt(value, 10) * (multipliers[unit] || 0);
    }
}

module.exports = TokenService;
