import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load env vars from .env file
config();

const REQUIRED_VARS = [
  'DATABASE_URL',
  'DIRECT_URL',
  'JWT_SECRET',
  'REFRESH_TOKEN_SECRET',
  'GOOGLE_CLIENT_IDS',
  'OPENROUTER_API_KEY',
];

const OPTIONAL_VARS = [
  'REDIS_URL',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'LLM_MOCK_MODE',
  'DEFAULT_FREE_MODEL',
  'DEFAULT_PREMIUM_MODEL',
  'FREE_DAILY_INTERACTIONS',
  'FREE_MAX_TOKENS_PER_RESPONSE',
  'PORT',
  'FRONTEND_URL',
];

async function checkProductionReadiness() {
  console.log('🔍 Verificando prontidão para produção...\n');

  let hasErrors = false;

  // Check required env vars
  console.log('📋 Variáveis obrigatórias:');
  for (const varName of REQUIRED_VARS) {
    const value = process.env[varName];
    if (!value) {
      console.log(`  ❌ ${varName}: NÃO CONFIGURADA`);
      hasErrors = true;
    } else {
      // Show partial info without exposing secrets
      const displayValue = varName.includes('SECRET') || varName.includes('KEY')
        ? `${value.substring(0, 8)}... (configurada)`
        : value;
      console.log(`  ✅ ${varName}: ${displayValue}`);
    }
  }

  // Check optional vars
  console.log('\n📋 Variáveis opcionais:');
  for (const varName of OPTIONAL_VARS) {
    const value = process.env[varName];
    if (!value) {
      console.log(`  ⚠️  ${varName}: não configurada (opcional)`);
    } else {
      if (varName.includes('SECRET') || varName.includes('KEY')) {
        console.log(`  ✅ ${varName}: ${value.substring(0, 8)}... (configurada)`);
      } else {
        console.log(`  ✅ ${varName}: ${value}`);
      }
    }
  }

  // Check LLM_MOCK_MODE
  console.log('\n🤖 Modo LLM:');
  const mockMode = process.env.LLM_MOCK_MODE === 'true';
  if (mockMode) {
    console.log('  ⚠️  LLM_MOCK_MODE=true (usando mock, não chamará LLMs reais)');
  } else {
    console.log('  ✅ LLM_MOCK_MODE=false (chamará LLMs reais)');
  }

  // Test database connectivity
  console.log('\n💾 Testando conectividade com banco de dados...');
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    console.log('  ✅ Conexão com banco de dados bem-sucedida');

    // Try a simple query
    const userCount = await prisma.user.count();
    console.log(`  ✅ Query teste executada (${userCount} usuários no banco)`);

    await prisma.$disconnect();
  } catch (error) {
    console.log('  ❌ Falha ao conectar com banco de dados');
    console.log(`     Erro: ${error instanceof Error ? error.message : error}`);
    hasErrors = true;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  if (hasErrors) {
    console.log('❌ Verificação concluída com erros. Corrija as variáveis acima.');
    process.exit(1);
  } else {
    console.log('✅ Verificação concluída com sucesso! Ambiente pronto para produção.');
    process.exit(0);
  }
}

checkProductionReadiness().catch((error) => {
  console.error('Erro inesperado:', error);
  process.exit(1);
});
