import {
  Body, Controller, Delete, Get, Param, Patch, Post,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { FacebookConnectDto } from './dto/facebook-connect.dto';

@ApiTags('Channels')
@ApiBearerAuth()
@Controller('api/v1/bots/:botId/channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Post()
  @ApiOperation({ summary: 'Add channel to bot' })
  create(
    @CurrentTenant() tenantId: string,
    @Param('botId', ParseUUIDPipe) botId: string,
    @Body() dto: CreateChannelDto,
  ) {
    return this.channelsService.create(tenantId, botId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List channels for bot' })
  findAll(
    @CurrentTenant() tenantId: string,
    @Param('botId', ParseUUIDPipe) botId: string,
  ) {
    return this.channelsService.findAll(tenantId, botId);
  }

  @Patch(':chId')
  @ApiOperation({ summary: 'Update channel config' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('botId', ParseUUIDPipe) botId: string,
    @Param('chId', ParseUUIDPipe) chId: string,
    @Body() dto: UpdateChannelDto,
  ) {
    return this.channelsService.update(tenantId, botId, chId, dto);
  }

  @Delete(':chId')
  @ApiOperation({ summary: 'Disconnect channel' })
  remove(
    @CurrentTenant() tenantId: string,
    @Param('botId', ParseUUIDPipe) botId: string,
    @Param('chId', ParseUUIDPipe) chId: string,
  ) {
    return this.channelsService.remove(tenantId, botId, chId);
  }

  @Post('facebook/connect')
  @ApiOperation({ summary: 'Connect Facebook page (stub)' })
  connectFacebook(
    @CurrentTenant() tenantId: string,
    @Param('botId', ParseUUIDPipe) botId: string,
    @Body() dto: FacebookConnectDto,
  ) {
    return this.channelsService.connectFacebook(tenantId, botId, dto);
  }
}
