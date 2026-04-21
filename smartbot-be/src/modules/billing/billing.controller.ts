import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { BillingService } from './billing.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { TopUpCreditsDto } from './dto/top-up-credits.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Billing')
@Controller('api/v1')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('plans')
  @Public()
  @ApiOperation({ summary: 'List available plans with pricing' })
  listPlans() {
    return this.billingService.listPlans();
  }

  @Get('subscription')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current subscription + credit usage' })
  getSubscription(@CurrentTenant() tenantId: string) {
    return this.billingService.getCurrentSubscription(tenantId);
  }

  @Post('subscription')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subscribe or upgrade plan' })
  subscribe(@CurrentTenant() tenantId: string, @Body() dto: SubscribeDto) {
    return this.billingService.subscribe(tenantId, dto);
  }

  @Patch('subscription')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update billing cycle' })
  updateSubscription(
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.billingService.updateSubscription(tenantId, dto);
  }

  @Delete('subscription')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel subscription at period end' })
  cancelSubscription(@CurrentTenant() tenantId: string) {
    return this.billingService.cancelSubscription(tenantId);
  }

  @Post('credits/top-up')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Purchase additional credits' })
  topUpCredits(
    @CurrentTenant() tenantId: string,
    @Body() dto: TopUpCreditsDto,
  ) {
    return this.billingService.topUpCredits(tenantId, dto);
  }

  @Get('credits/usage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current period credit usage' })
  getCreditUsage(@CurrentTenant() tenantId: string) {
    return this.billingService.getCreditUsage(tenantId);
  }

  @Get('payments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Payment history' })
  getPayments(
    @CurrentTenant() tenantId: string,
    @Query() query: PaginationDto,
  ) {
    return this.billingService.getPaymentHistory(tenantId, query);
  }

  @Post('payments/vnpay/callback')
  @Public()
  @ApiOperation({ summary: 'VNPay IPN callback (public)' })
  vnpayCallback(@Body() body: Record<string, any>) {
    return this.billingService.handleVnpayCallback(body);
  }

  @Post('payments/momo/callback')
  @Public()
  @ApiOperation({ summary: 'MoMo IPN callback (public)' })
  momoCallback(@Body() body: Record<string, any>) {
    return this.billingService.handleMomoCallback(body);
  }
}
