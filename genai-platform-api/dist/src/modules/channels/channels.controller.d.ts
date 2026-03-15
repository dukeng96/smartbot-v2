import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { FacebookConnectDto } from './dto/facebook-connect.dto';
export declare class ChannelsController {
    private readonly channelsService;
    constructor(channelsService: ChannelsService);
    create(tenantId: string, botId: string, dto: CreateChannelDto): Promise<{
        type: string;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        botId: string;
        config: import("@prisma/client/runtime/client").JsonValue;
        connectedAt: Date | null;
        lastActiveAt: Date | null;
    }>;
    findAll(tenantId: string, botId: string): Promise<{
        type: string;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        botId: string;
        config: import("@prisma/client/runtime/client").JsonValue;
        connectedAt: Date | null;
        lastActiveAt: Date | null;
    }[]>;
    update(tenantId: string, botId: string, chId: string, dto: UpdateChannelDto): Promise<{
        type: string;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        botId: string;
        config: import("@prisma/client/runtime/client").JsonValue;
        connectedAt: Date | null;
        lastActiveAt: Date | null;
    }>;
    remove(tenantId: string, botId: string, chId: string): Promise<{
        message: string;
    }>;
    connectFacebook(tenantId: string, botId: string, dto: FacebookConnectDto): Promise<{
        type: string;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        botId: string;
        config: import("@prisma/client/runtime/client").JsonValue;
        connectedAt: Date | null;
        lastActiveAt: Date | null;
    }>;
}
