// validators/citizenValidator.js
const { body } = require('express-validator');

/**
 * Validation des champs pour l'inscription d'un citoyen
 */
const registerValidator = [
    body('nom')
        .trim()
        .isLength({ min: 2 })
        .withMessage('Le nom complet doit contenir au moins 2 caractères')
        .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
        .withMessage('Le nom ne doit contenir que des lettres et espaces'),

    body('email')
        .isEmail()
        .withMessage('Adresse email invalide')
        .normalizeEmail(),

    body('password')
        .isLength({ min: 6 })
        .withMessage('Le mot de passe doit contenir au moins 6 caractères')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial'),

    body('numero')
        .matches(/^[0-9]{8,10}$/)
        .withMessage('Le numéro de téléphone doit contenir entre 8 et 10 chiffres')
];

/**
 * Validation des champs pour la mise à jour du profil citoyen
 */
const updateProfileValidator = [
    body('firstName')
        .optional()
        .trim()
        .isLength({ min: 2 })
        .withMessage('Le prénom doit contenir au moins 2 caractères')
        .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
        .withMessage('Le prénom ne doit contenir que des lettres'),

    body('lastName')
        .optional()
        .trim()
        .isLength({ min: 2 })
        .withMessage('Le nom doit contenir au moins 2 caractères')
        .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
        .withMessage('Le nom ne doit contenir que des lettres'),

    body('phoneNumber')
        .optional()
        .matches(/^[0-9]{8,10}$/)
        .withMessage('Le numéro de téléphone doit contenir entre 8 et 10 chiffres')
];

/**
 * Validation pour la création d'alerte
 */
const createAlertValidator = [
    body('location')
        .isString()
        .withMessage('La localisation est requise'),

    body('category')
        .isIn(['Accidents', 'Incendies', 'Inondations', 'Malaises', 'Noyade', 'Autre'])
        .withMessage('Catégorie d\'alerte invalide'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('La description ne peut pas dépasser 1000 caractères'),

    body('address')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('L\'adresse ne peut pas dépasser 500 caractères'),

    body('severity')
        .optional()
        .isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
        .withMessage('Niveau de gravité invalide')
];

/**
 * Validation pour les numéros de confiance
 */
const safeNumberValidator = [
    body('number')
        .matches(/^[0-9]{8,10}$/)
        .withMessage('Le numéro de téléphone doit contenir entre 8 et 10 chiffres'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage('La description ne peut pas dépasser 255 caractères')
];

module.exports = {
    registerValidator,
    updateProfileValidator,
    createAlertValidator,
    safeNumberValidator
};