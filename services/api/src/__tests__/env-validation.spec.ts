import { validateEnv } from '../common/env-validation';

describe('validateEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should not exit on development', () => {
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = '';
    process.env.JWT_SECRET = '';
    const log = jest.fn();
    // Should not call process.exit
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    validateEnv(log);
    expect(exitSpy).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it('should exit on staging with missing DATABASE_URL', () => {
    process.env.NODE_ENV = 'staging';
    process.env.DATABASE_URL = '';
    process.env.JWT_SECRET = 'real-secret-not-a-placeholder';
    process.env.REFRESH_TOKEN_SECRET = 'real-secret-not-a-placeholder';
    process.env.LLM_MOCK_MODE = 'false';
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    validateEnv();
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('should exit on staging with placeholder JWT_SECRET', () => {
    process.env.NODE_ENV = 'staging';
    process.env.DATABASE_URL = 'postgres://ok';
    process.env.JWT_SECRET = 'super-secret-jwt-key-change-in-production';
    process.env.REFRESH_TOKEN_SECRET = 'a'.repeat(32);
    process.env.LLM_MOCK_MODE = 'false';
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    validateEnv();
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('should exit on staging with short JWT_SECRET (< 32 chars)', () => {
    process.env.NODE_ENV = 'staging';
    process.env.DATABASE_URL = 'postgres://ok';
    process.env.JWT_SECRET = 'short';
    process.env.REFRESH_TOKEN_SECRET = 'a'.repeat(32);
    process.env.LLM_MOCK_MODE = 'false';
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    validateEnv();
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('should warn on staging with LLM_MOCK_MODE=true', () => {
    process.env.NODE_ENV = 'staging';
    process.env.DATABASE_URL = 'postgres://ok';
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.REFRESH_TOKEN_SECRET = 'b'.repeat(32);
    process.env.LLM_MOCK_MODE = 'true';
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    validateEnv();
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('should pass on staging with valid config', () => {
    process.env.NODE_ENV = 'staging';
    process.env.DATABASE_URL = 'postgres://ok';
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.REFRESH_TOKEN_SECRET = 'b'.repeat(32);
    process.env.LLM_MOCK_MODE = 'false';
    process.env.ALLOWED_ORIGINS = 'https://staging.example.com';
    const log = jest.fn();
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    validateEnv(log);
    expect(exitSpy).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it('should exit on staging when QA reading provider failure harness is enabled', () => {
    process.env.NODE_ENV = 'staging';
    process.env.DATABASE_URL = 'postgres://ok';
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.REFRESH_TOKEN_SECRET = 'b'.repeat(32);
    process.env.LLM_MOCK_MODE = 'false';
    process.env.ALLOWED_ORIGINS = 'https://staging.example.com';
    process.env.QA_FORCE_READING_PROVIDER_FAILURE = 'true';

    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    validateEnv();

    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});
