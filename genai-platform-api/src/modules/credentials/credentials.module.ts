import { Module } from '@nestjs/common';
import { CredentialsController, CredentialsInternalController } from './credentials.controller';
import { CredentialsService } from './credentials.service';

@Module({
  controllers: [CredentialsController, CredentialsInternalController],
  providers: [CredentialsService],
  exports: [CredentialsService],
})
export class CredentialsModule {}
