"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('aiEngine', () => ({
    url: process.env.AI_ENGINE_URL || 'http://localhost:8000',
    internalApiKey: process.env.INTERNAL_API_KEY || 'internal-secret-key',
}));
//# sourceMappingURL=ai-engine.config.js.map