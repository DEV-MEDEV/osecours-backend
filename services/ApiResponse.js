/**
 * Service de gestion des réponses API standardisées
 */
class ApiResponse {
    /**
     * Réponse réussie avec données.
     * @param {Object} res - L'objet de réponse Express.
     * @param {string} message - Message de succès.
     * @param {Object|null} data - Données à inclure dans la réponse (par défaut null).
     * @returns {Object} - Réponse Express avec statut 200.
     */
    static success(res, message, data = null) {
        return res.status(200).json({ message, data });
    }

    /**
     * Réponse en cas de création réussie.
     * @param {Object} res
     * @param {string} message
     * @param {Object|null} data
     * @returns {Object}
     */
    static created(res, message, data = null) {
        return res.status(201).json({ message, data });
    }

    /**
     * Réponse en cas de requête incorrecte.
     * @param {Object} res
     * @param {string} message
     * @param {Object|null} data
     * @returns {Object}
     */
    static badRequest(res, message, data = null) {
        return res.status(400).json({ message, data });
    }

    /**
     * Réponse en cas de ressource non trouvée.
     * @param {Object} res
     * @param {string} message
     * @param {Object|null} data
     * @returns {Object}
     */
    static notFound(res, message, data = null) {
        return res.status(404).json({ message, data });
    }

    /**
     * Réponse en cas d'accès non autorisé.
     * @param {Object} res
     * @param {string} message
     * @param {Object|null} data
     * @returns {Object}
     */
    static unauthorized(res, message, data = null) {
        return res.status(401).json({ message, data });
    }

    /**
     * Réponse en cas d'erreur serveur.
     * @param {Object} res
     * @param {string} message
     * @param {Object|null} data
     * @returns {Object}
     */
    static serverError(res, message, data = null) {
        return res.status(500).json({ message, data });
    }
}

module.exports = ApiResponse;
  