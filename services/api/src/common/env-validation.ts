const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

const PLACEHOLDER_PATTERNS = /(super-secret|change-me|placeholder|example|secret|password)/i;

function isStrongSecret(value: string | undefined): boolean {
  if (!value || value.length < 32) return false;
  if (PLACEHOLDER_PATTERNS.test(value)) return false;
  return true;
}

export function validateEnv(log: typeof console.log = console.log): void {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isStaging = nodeEnv === 'staging';
  const isProduction = nodeEnv === 'production';

  if (isProduction || isStaging) {
    const missing: string[] = [];

    if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
    if (!isStrongSecret(process.env.JWT_SECRET)) {
      if (!process.env.JWT_SECRET) missing.push('JWT_SECRET is missing');
      else if (process.env.JWT_SECRET.length < 32) missing.push('JWT_SECRET is too short (min 32 chars)');
      else missing.push('JWT_SECRET contains a placeholder value');
    }
    if (!isStrongSecret(process.env.REFRESH_TOKEN_SECRET)) {
      if (!process.env.REFRESH_TOKEN_SECRET) missing.push('REFRESH_TOKEN_SECRET is missing');
      else if (process.env.REFRESH_TOKEN_SECRET.length < 32) missing.push('REFRESH_TOKEN_SECRET is too short (min 32 chars)');
      else missing.push('REFRESH_TOKEN_SECRET contains a placeholder value');
    }
    if (process.env.LLM_MOCK_MODE === 'true') missing.push('LLM_MOCK_MODE=true (must be false in staging/production)');

    if (missing.length > 0) {
      log(`${RED}[ENV] FATAL: ${nodeEnv} environment has critical config issues:${RESET}`);
      missing.forEach((m) => log(`${RED}  - ${m}${RESET}`));
      process.exit(1);
    }

    if (!process.env.FRONTEND_URL && !process.env.ALLOWED_ORIGINS) {
      log(`${YELLOW}[ENV] WARN: No CORS origin configured for ${nodeEnv}.${RESET}`);
    }
    if (process.env.SWAGGER_ENABLED === 'true') {
      log(`${YELLOW}[ENV] WARN: Swagger is enabled in ${nodeEnv} environment.${RESET}`);
    }
    if (process.env.FREE_LLM_ONLY === 'true') {
      log(`${YELLOW}[ENV] WARN: FREE_LLM_ONLY=true on ${nodeEnv}. Paid models will be blocked.${RESET}`);
    }
    if (process.env.QA_FORCE_READING_PROVIDER_FAILURE === 'true') {
      log(`${RED}[ENV] FATAL: QA_FORCE_READING_PROVIDER_FAILURE=true on ${nodeEnv}. This flag is dev/test only and must NOT be enabled in staging/production.${RESET}`);
      process.exit(1);
    }

    log(`[ENV] ${nodeEnv} environment validated.`);
  } else {
    log(`[ENV] development environment — skipping strict env validation.`);
  }
}
