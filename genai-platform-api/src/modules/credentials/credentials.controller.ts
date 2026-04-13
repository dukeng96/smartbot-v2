import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CredentialsService } from './credentials.service';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { UpdateCredentialDto } from './dto/update-credential.dto';

@ApiTags('Credentials')
@ApiBearerAuth()
@Controller('api/v1/credentials')
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  @Post()
  @ApiOperation({ summary: 'Create encrypted credential' })
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateCredentialDto,
  ) {
    return this.credentialsService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List credentials (masked, no plaintext)' })
  findAll(@CurrentTenant() tenantId: string) {
    return this.credentialsService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get credential meta (no plaintext)' })
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.credentialsService.findOne(tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update credential name or rotate secret' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCredentialDto,
  ) {
    return this.credentialsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete credential' })
  remove(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.credentialsService.remove(tenantId, id);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test credential connectivity' })
  test(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.credentialsService.testCredential(tenantId, id);
  }
}
