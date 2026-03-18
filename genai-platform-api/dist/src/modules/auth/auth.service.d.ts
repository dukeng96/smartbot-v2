import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly configService;
    private readonly logger;
    constructor(prisma: PrismaService, jwtService: JwtService, configService: ConfigService);
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: any;
            email: any;
            fullName: any;
            avatarUrl: any;
            phone: any;
            emailVerified: any;
            authProvider: any;
            status: any;
            createdAt: any;
        };
        tenant: {
            id: any;
            name: any;
            slug: any;
            logoUrl: any;
            planId: any;
        };
        role: "owner";
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: any;
            email: any;
            fullName: any;
            avatarUrl: any;
            phone: any;
            emailVerified: any;
            authProvider: any;
            status: any;
            createdAt: any;
        };
        tenant: {
            id: any;
            name: any;
            slug: any;
            logoUrl: any;
            planId: any;
        };
        role: string;
    }>;
    logout(refreshToken: string): Promise<{
        message: string;
    }>;
    refreshTokens(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: any;
            email: any;
            fullName: any;
            avatarUrl: any;
            phone: any;
            emailVerified: any;
            authProvider: any;
            status: any;
            createdAt: any;
        };
        tenant: {
            id: any;
            name: any;
            slug: any;
            logoUrl: any;
            planId: any;
        };
        role: string;
    }>;
    forgotPassword(email: string): Promise<{
        message: string;
    }>;
    resetPassword(token: string, newPassword: string): Promise<void>;
    verifyEmail(token: string): Promise<void>;
    googleOAuth(idToken: string): Promise<void>;
    private generateTokens;
    private sanitizeUser;
    private sanitizeTenant;
}
