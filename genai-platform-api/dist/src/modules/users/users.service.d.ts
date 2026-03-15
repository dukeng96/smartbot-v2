import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getProfile(userId: string): Promise<{
        email: string;
        fullName: string | null;
        id: string;
        avatarUrl: string | null;
        phone: string | null;
        emailVerified: boolean;
        authProvider: string;
        lastLoginAt: Date | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateProfile(userId: string, dto: UpdateUserDto): Promise<{
        email: string;
        fullName: string | null;
        id: string;
        avatarUrl: string | null;
        phone: string | null;
        emailVerified: boolean;
        authProvider: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
