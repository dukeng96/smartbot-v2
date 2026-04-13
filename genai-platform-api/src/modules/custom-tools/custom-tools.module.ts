import { Module } from '@nestjs/common';
import { CustomToolsController } from './custom-tools.controller';
import { CustomToolsService } from './custom-tools.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  controllers: [CustomToolsController],
  providers: [CustomToolsService, PrismaService],
  exports: [CustomToolsService],
})
export class CustomToolsModule {}
