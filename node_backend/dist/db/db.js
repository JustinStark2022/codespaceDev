"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.sql = void 0;
exports.connectWithRetry = connectWithRetry;
const neon_http_1 = require("drizzle-orm/neon-http");
const serverless_1 = require("@neondatabase/serverless");
const schema = __importStar(require("./schema"));
const logger_1 = __importDefault(require("@/utils/logger"));
serverless_1.neonConfig.fetchConnectionCache = false;
const connectionString = process.env.DATABASE_POOL_URL || process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_POOL_URL or DATABASE_URL is not set");
}
exports.sql = (0, serverless_1.neon)(connectionString);
exports.db = (0, neon_http_1.drizzle)(exports.sql, { schema, logger: process.env.NODE_ENV === 'development' });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function connectWithRetry(retries = 5, delay = 2000) {
    let lastError;
    for (let i = 0; i < retries; i++) {
        try {
            await (0, exports.sql) `SELECT 1`;
            logger_1.default.info("✅ Database connected successfully.");
            return;
        }
        catch (error) {
            lastError = error;
            const currentDelay = delay * 2 ** i;
            logger_1.default.warn(`❌ Database connection failed. Retrying in ${currentDelay / 1000}s... (Attempt ${i + 1}/${retries})`);
            await sleep(currentDelay);
        }
    }
    logger_1.default.error("❌ Could not connect to the database after several retries.", { error: lastError });
    process.exit(1);
}
//# sourceMappingURL=db.js.map