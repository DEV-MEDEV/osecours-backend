// config/const.js
const dayjs = require('dayjs');

class Consts {
    // Infos système
    static PORT_SYSTEM = 3000;
    static APP_NAME = "O'secours Backend";
    static APP_AUTHOR = "MEDEV GROUP";
    static JWT_EXPIRATION = "24h";

    // Clé secrète selon l'environnement
    static JWT_SECRET = (() => {
        const env = process.env.NODE_ENV || 'development';
        switch (env) {
            case 'production':
                return process.env.JWT_SECRET_PROD;
            case 'test':
                return process.env.JWT_SECRET_TEST;
            default:
                return process.env.JWT_SECRET_DEV;
        }
    })();

    // Configuration SMS Letexto
    static SMS_CONFIG = {
        baseUrl: process.env.LETEXTO_API_URL,
        apiKey: process.env.LETEXTO_API_KEY,
        sender: 'REXTO',
        countryCode: '225' // Côte d'Ivoire
    };

    // Configuration OTP
    static OTP_CONFIG = {
        length: 4,
        expirationMinutes: 5,
        maxAttempts: 3
    };

    // Librairie de date (Day.js)
    static getDateLib() {
        return dayjs;
    }

    // Description du projet
    static PROJECT_DESCRIPTION =
        "API backend du système d'alerte et de coordination des secours O'secours, développé par MEDEV GROUP.";
}

module.exports = Consts;