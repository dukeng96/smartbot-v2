import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { CreditsService } from './credits.service';
import { BillingController } from './billing.controller';

@Module({
  controllers: [BillingController],
  providers: [BillingService, CreditsService],
  exports: [BillingService, CreditsService],
})
export class BillingModule {}
