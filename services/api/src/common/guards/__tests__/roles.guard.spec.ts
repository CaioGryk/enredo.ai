import { RolesGuard } from '../roles.guard';
import { ExecutionContext } from '@nestjs/common';

// Local enum to avoid dependency on generated @prisma/client before generate
enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: any;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };

    guard = new RolesGuard(reflector);
  });

  const createMockContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  };

  describe('when no roles are required', () => {
    it('should allow access when no roles metadata exists', () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);

      const context = createMockContext({ role: UserRole.USER });
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when roles array is empty', () => {
      reflector.getAllAndOverride.mockReturnValue([]);

      const context = createMockContext({ role: UserRole.USER });
      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('when roles are required', () => {
    it('should allow access when user has required role (ADMIN)', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      const context = createMockContext({ role: UserRole.ADMIN });
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should deny access when user has USER role but ADMIN is required', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      const context = createMockContext({ role: UserRole.USER });
      expect(guard.canActivate(context)).toBe(false);
    });

    it('should deny access when user has PREMIUM subscription but not ADMIN role', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      const context = createMockContext({ role: UserRole.USER, plan: 'PREMIUM' });
      expect(guard.canActivate(context)).toBe(false);
    });

    it('should allow access when user has one of multiple allowed roles', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.USER, UserRole.ADMIN]);

      const context = createMockContext({ role: UserRole.USER });
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should deny access when user is undefined (unauthenticated)', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      const context = createMockContext(undefined);
      expect(guard.canActivate(context)).toBe(false);
    });

    it('should deny access when user has no role property (fails closed)', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      const context = createMockContext({ id: 'user-1' }); // no role property
      expect(guard.canActivate(context)).toBe(false);
    });

    it('should deny access when user role is undefined', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      const context = createMockContext({ role: undefined });
      expect(guard.canActivate(context)).toBe(false);
    });
  });
});
