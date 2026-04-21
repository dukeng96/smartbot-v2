import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FlowExecService } from './flow-exec.service';
import { FlowExecController } from './flow-exec.controller';
import { EngineClient } from './engine-client';
import { CredentialsModule } from '../credentials/credentials.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [CredentialsModule, BillingModule],
  controllers: [FlowExecController],
  providers: [
    FlowExecService,
    {
      provide: EngineClient,
      useFactory: (config: ConfigService) =>
        new EngineClient(
          config.get<string>('aiEngine.url', 'http://localhost:8000'),
          config.get<string>('aiEngine.internalApiKey', ''),
        ),
      inject: [ConfigService],
    },
  ],
  exports: [FlowExecService],
})
export class FlowExecModule {}
