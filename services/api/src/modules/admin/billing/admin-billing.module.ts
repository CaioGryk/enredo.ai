import { Module } from '@nestjs/common';
import { BillingModule } from '../../billing/billing.module';
import { AdminBillingController } from './admin-billing.controller';

@Module({
  imports: [BillingModule],
  controllers: [AdminBillingController],
})
export class AdminBillingModule {}
