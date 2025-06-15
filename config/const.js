const dayjs = require('dayjs'); // Remplace moment

class Consts {
    // Infos système
    static PORT_SYSTEM = 3000;
    static APP_NAME = "O'secours Backend";
    static APP_AUTHOR = "MEDEV GROUP";
    static JWT_SECRET = "YOUR_JWT_SECRET";
    static JWT_EXPIRATION = "24h";

    // Librairie de date (Day.js)
    static getDateLib() {
        return dayjs;
    }

    // Description du projet
    static PROJECT_DESCRIPTION = "API backend du système d’alerte et de coordination des secours O'secours, développé par MEDEV GROUP.";
}

module.exports = Consts;
