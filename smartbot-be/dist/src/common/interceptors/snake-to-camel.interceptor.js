"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnakeToCamelInterceptor = void 0;
const common_1 = require("@nestjs/common");
let SnakeToCamelInterceptor = class SnakeToCamelInterceptor {
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        if (request.body && typeof request.body === 'object' && !Array.isArray(request.body)) {
            const converted = {};
            for (const [key, val] of Object.entries(request.body)) {
                const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
                converted[camelKey] = val;
            }
            request.body = converted;
        }
        return next.handle();
    }
};
exports.SnakeToCamelInterceptor = SnakeToCamelInterceptor;
exports.SnakeToCamelInterceptor = SnakeToCamelInterceptor = __decorate([
    (0, common_1.Injectable)()
], SnakeToCamelInterceptor);
//# sourceMappingURL=snake-to-camel.interceptor.js.map