"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = __importDefault(require("pg"));
const pool = new pg_1.default.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/genai_platform',
});
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    console.log('Seeding plans...');
    await prisma.plan.createMany({
        data: [
            {
                name: 'Free',
                slug: 'free',
                description: 'Get started for free with basic features',
                maxBots: 1,
                maxCreditsPerMonth: 100,
                maxKnowledgeCharsPerBot: BigInt(250000),
                maxTeamMembers: 1,
                features: {
                    analytics: false,
                    saveConversations: false,
                    customCss: false,
                    removeBranding: false,
                    facebookIntegration: false,
                    apiAccess: false,
                },
                priceMonthly: BigInt(0),
                priceYearly: BigInt(0),
                priceWeekly: BigInt(0),
                sortOrder: 0,
            },
            {
                name: 'Starter',
                slug: 'starter',
                description: 'Perfect for small businesses getting started with AI',
                maxBots: 5,
                maxCreditsPerMonth: 3000,
                maxKnowledgeCharsPerBot: BigInt(25000000),
                maxTeamMembers: 1,
                features: {
                    analytics: true,
                    saveConversations: true,
                    voiceInput: true,
                    customCss: false,
                    removeBranding: false,
                    facebookIntegration: false,
                    apiAccess: false,
                    customDomains: 1,
                },
                priceMonthly: BigInt(199000),
                priceYearly: BigInt(1990000),
                priceWeekly: BigInt(59000),
                sortOrder: 1,
            },
            {
                name: 'Advanced',
                slug: 'advanced',
                description: 'Advanced features for growing businesses',
                maxBots: 10,
                maxCreditsPerMonth: 12500,
                maxKnowledgeCharsPerBot: BigInt(50000000),
                maxTeamMembers: 3,
                features: {
                    analytics: true,
                    saveConversations: true,
                    voiceInput: true,
                    customCss: true,
                    removeBranding: true,
                    facebookIntegration: true,
                    humanHandover: true,
                    leadGeneration: true,
                    apiAccess: false,
                    customDomains: 5,
                },
                priceMonthly: BigInt(699000),
                priceYearly: BigInt(6990000),
                priceWeekly: BigInt(199000),
                sortOrder: 2,
            },
            {
                name: 'Pro',
                slug: 'pro',
                description: 'Full power for professional teams',
                maxBots: 50,
                maxCreditsPerMonth: 50000,
                maxKnowledgeCharsPerBot: BigInt(200000000),
                maxTeamMembers: 10,
                features: {
                    analytics: true,
                    saveConversations: true,
                    voiceInput: true,
                    customCss: true,
                    removeBranding: true,
                    facebookIntegration: true,
                    humanHandover: true,
                    leadGeneration: true,
                    apiAccess: true,
                    customDomains: 50,
                    slaGuarantee: true,
                    advancedModels: true,
                },
                priceMonthly: BigInt(2099000),
                priceYearly: BigInt(20990000),
                priceWeekly: BigInt(599000),
                sortOrder: 3,
            },
        ],
        skipDuplicates: true,
    });
    console.log('Plans seeded successfully!');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map