import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getProfile(userId: string): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        email: string;
        fullName: string | null;
        avatarUrl: string | null;
        phone: string | null;
        emailVerified: boolean;
        authProvider: string;
        lastLoginAt: Date | null;
        updatedAt: Date;
    }>;
    updateProfile(userId: string, dto: UpdateUserDto): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        email: string;
        fullName: string | null;
        avatarUrl: string | null;
        phone: string | null;
        emailVerified: boolean;
        authProvider: string;
        updatedAt: Date;
    }>;
}
