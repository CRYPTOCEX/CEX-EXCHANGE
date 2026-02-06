"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateApiKey = generateApiKey;
const API_KEY_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
function generateApiKey(length = 64) {
    let apiKey = "";
    const charactersLength = API_KEY_CHARACTERS.length;
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charactersLength);
        apiKey += API_KEY_CHARACTERS.charAt(randomIndex);
    }
    return apiKey;
}
