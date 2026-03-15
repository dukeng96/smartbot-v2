import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { FacebookConnectDto } from './dto/facebook-connect.dto';

@Injectable()
export class ChannelsService {
  private readonly logger = new Logger(ChannelsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, botId: string, dto: CreateChannelDto) {
    await this.ensureBotExists(tenantId, botId);

    return this.prisma.channel.create({
      data: {
        botId,
        tenantId,
        type: dto.type,
        config: dto.config ?? {},
        connectedAt: new Date(),
      },
    });
  }

  async findAll(tenantId: string, botId: string) {
    await this.ensureBotExists(tenantId, botId);

    return this.prisma.channel.findMany({
      where: { botId, tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(tenantId: string, botId: string, channelId: string, dto: UpdateChannelDto) {
    await this.ensureChannelExists(tenantId, botId, channelId);

    return this.prisma.channel.update({
      where: { id: channelId },
      data: {
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.config !== undefined && { config: dto.config }),
        ...(dto.status === 'active' && { lastActiveAt: new Date() }),
      },
    });
  }

  async remove(tenantId: string, botId: string, channelId: string) {
    await this.ensureChannelExists(tenantId, botId, channelId);

    await this.prisma.channel.delete({ where: { id: channelId } });
    return { message: 'Channel disconnected' };
  }

  async connectFacebook(tenantId: string, botId: string, dto: FacebookConnectDto) {
    await this.ensureBotExists(tenantId, botId);

    // Stub: In production, verify token with Facebook Graph API
    this.logger.log(`[STUB] Facebook connect for bot ${botId}, pageId: ${dto.pageId}`);

    return this.prisma.channel.create({
      data: {
        botId,
        tenantId,
        type: 'facebook_messenger',
        status: 'active',
        config: { pageId: dto.pageId, accessToken: dto.accessToken },
        connectedAt: new Date(),
      },
    });
  }

  private async ensureBotExists(tenantId: string, botId: string) {
    const bot = await this.prisma.bot.findFirst({
      where: { id: botId, tenantId, deletedAt: null },
    });
    if (!bot) throw new NotFoundException('Bot not found');
    return bot;
  }

  private async ensureChannelExists(tenantId: string, botId: string, channelId: string) {
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, botId, tenantId },
    });
    if (!channel) throw new NotFoundException('Channel not found');
    return channel;
  }
}
