import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { BillingService } from '../../../billing/billing.service';
import { AdminBillingController } from '../admin-billing.controller';

describe('AdminBillingController', () => {
  let controller: AdminBillingController;
  let billingService: { adminGrantCredits: jest.Mock };

  beforeEach(async () => {
    billingService = {
      adminGrantCredits: jest.fn().mockResolvedValue({ success: true, newBalance: 75 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminBillingController],
      providers: [
        {
          provide: BillingService,
          useValue: billingService,
        },
      ],
    }).compile();

    controller = module.get<AdminBillingController>(AdminBillingController);
  });

  it('should delegate grantCredits with admin id, target user id, and dto', async () => {
    const dto = { amount: 25, note: 'Manual beta credit adjustment' };

    const result = await controller.grantCredits('admin-1', 'user-1', dto);

    expect(billingService.adminGrantCredits).toHaveBeenCalledWith('admin-1', 'user-1', dto);
    expect(result).toEqual({ success: true, newBalance: 75 });
  });

  it('should apply JwtAuthGuard and RolesGuard at controller level', () => {
    const guards = Reflect.getMetadata('__guards__', AdminBillingController);

    expect(guards).toEqual(expect.arrayContaining([JwtAuthGuard, RolesGuard]));
  });

  it('should require ADMIN role at controller level', () => {
    const roles = Reflect.getMetadata('roles', AdminBillingController);

    expect(roles).toEqual([UserRole.ADMIN]);
  });
});
