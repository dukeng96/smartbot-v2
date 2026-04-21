"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuotaType = exports.QUOTA_TYPE_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.QUOTA_TYPE_KEY = 'quotaType';
const QuotaType = (type) => (0, common_1.SetMetadata)(exports.QUOTA_TYPE_KEY, type);
exports.QuotaType = QuotaType;
//# sourceMappingURL=quota-type.decorator.js.map