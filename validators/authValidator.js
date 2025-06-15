// validators/authValidator.js
const { body } = require('express-validator');

/**
 * Validation des champs pour la connexion utilisateur
 */
const loginValidator = [
    body('email')
        .isEmail().withMessage("L'adresse e-mail est invalide")
        .normalizeEmail(),

    body('password')
        .isString().withMessage('Le mot de passe est requis')
        .isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères')
];

/**
 * Validation des champs pour l’enregistrement (si besoin plus tard)
 */
const registerValidator = [
    body('firstName')
        .isString().withMessage('Le prénom est requis'),

    body('lastName')
        .isString().withMessage('Le nom est requis'),

    body('email')
        .isEmail().withMessage("L'adresse e-mail est invalide")
        .normalizeEmail(),

    body('password')
        .isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères')
];

module.exports = {
    loginValidator,
    registerValidator
};
