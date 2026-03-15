import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { GoogleOAuthDto } from './dto/google-oauth.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
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
        };
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
    }>;
    logout(dto: RefreshTokenDto): Promise<{
        message: string;
    }>;
    refresh(dto: RefreshTokenDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<void>;
    verifyEmail(dto: VerifyEmailDto): Promise<void>;
    googleOAuth(dto: GoogleOAuthDto): Promise<void>;
}
