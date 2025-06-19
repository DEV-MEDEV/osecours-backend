const prisma = require('../prisma/client');

/**
 * Service de journalisation des événements système dans la base de données.
 */
class Logger {
    /**
     * Enregistre un événement de log.
     * @param {Object} options
     * @param {string} options.message - Description de l'événement.
     * @param {string} [options.source] - Source (route, service, etc.).
     * @param {string} [options.userId] - ID utilisateur concerné.
     * @param {string} [options.action] - Action effectuée (ex : "ALERT_CREATED").
     * @param {string} [options.ipAddress] - Adresse IP d'origine.
     * @param {Object} [options.requestData] - Données envoyées.
     * @param {Object} [options.responseData] - Données retournées.
     * @param {string} [options.status] - Statut final (SUCCESS, FAILED...).
     * @param {string} [options.environment] - Environnement d'exécution.
     * @param {Object} [options.deviceInfo] - Infos navigateur/appareil.
     */
    static async logEvent({
        message,
        source = null,
        userId = null,
        action = null,
        ipAddress = null,
        requestData = null,
        responseData = null,
        status = null,
        environment = process.env.NODE_ENV || 'development',
        deviceInfo = null
    }) {
        try {
            await prisma.log.create({
                data: {
                    message,
                    source,
                    userId,
                    action,
                    ipAddress,
                    requestData,
                    responseData,
                    status,
                    environment,
                    deviceInfo
                }
            });
        } catch (error) {
            console.error('Erreur lors de l’enregistrement du log :', error.message);
        }
    }
}

module.exports = Logger;
