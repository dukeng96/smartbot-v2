import { Module } from '@nestjs/common';
import { CustomToolsController } from './custom-tools.controller';
import { InternalCustomToolsController } from './internal-custom-tools.controller';
import { CustomToolsService } from './custom-tools.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { InternalApiKeyGuard } from '../../common/guards/internal-api-key.guard';

@Module({
  controllers: [CustomToolsController, InternalCustomToolsController],
  providers: [CustomToolsService, PrismaService, InternalApiKeyGuard],
  exports: [CustomToolsService],
})
export class CustomToolsModule {}
