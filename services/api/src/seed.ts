import { PrismaClient, CharacterRole, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const GENRES = [
  'mistério', 'romance', 'ficção-científica', 'terror', 'aventura',
  'drama', 'comédia', 'suspense', 'histórico'
];

const STORIES = [
  {
    title: 'O Enigma do Lighthouse',
    slug: 'o-enigma-do-lighthouse',
    synopsis: 'Quando o detetive Marcos é chamado para investigar uma série de eventos misteriosos em um farol isolado, ele descobre que o tempo não é linear e que alguns segredos são melhor deixados enterrados no fundo do mar.',
    genres: ['mistério', 'suspense'],
    authorName: 'Ana Ribeiro',
    isPremium: false,
    totalChapters: 10,
    basePrompt: 'Você é um detetive investigativo em uma história de mistério ambientada em um farol isolado na costa brasileira. O tom é sombrio e suspense.',
    tone: 'sombrio e misterioso',
    styleGuide: 'Prosa descritiva com diálogos curtos e revelações graduais.',
    worldRules: 'O farol possui segredos sobre o passado que afetam o presente.',
    openingScene: 'O nevoeiro envolve o farol enquanto você chega à porta.',
    characters: [
      { name: 'Marcos Detetive', role: 'PROTAGONIST', description: 'Um detetive aposentado com um passado enigmático.' },
      { name: 'Helena', role: 'SUPPORTING', description: 'A guardiã do farol que guarda um segredo há décadas.' },
      { name: 'Capitão Silva', role: 'ANTAGONIST', description: 'Um homem obcecado pelo tesouro perdido.' },
    ],
  },
  {
    title: 'Amor nas Estrelas',
    slug: 'amor-nas-estrelas',
    synopsis: 'Em um futuro onde a humanidade colonizou Marte, Lara trabalha como engenheira na primeira colônia. Quando conhece o misterioso visitante de uma nave perdida, ambos descobrem que o amor transcende não apenas a Terra, mas o tempo.',
    genres: ['romance', 'ficção-científica'],
    authorName: 'Pedro Santos',
    isPremium: false,
    totalChapters: 8,
    basePrompt: 'Você é um astronauta em uma história de amor ambientada em Marte. O tom é esperançoso e romântico com elementos de ficção científica.',
    tone: 'romântico e esperançoso',
    styleGuide: 'Diálogos emotivos com descrições do paisagem marciana.',
    worldRules: 'Marte foi colonizado há 50 anos com tecnologia avançada.',
    openingScene: 'O sol vermelho de Marte se põe no horizonte enquanto você observa da base.',
    characters: [
      { name: 'Lara', role: 'PROTAGONIST', description: 'Engenheira brilhante com medo de se comprometer.' },
      { name: 'Kai', role: 'SUPPORTING', description: 'O visitante misteriosa com memórias de outro tempo.' },
    ],
  },
  {
    title: 'O Clube dos Mentirosos',
    slug: 'o-clube-dos-mentirosos',
    synopsis: 'Numa pequena cidade onde todos têm segredos, cinco estranhos são convidados para um fim de semana em uma mansão. Quando a noite cai e os corpos começam a aparecer, a única coisa mais perigosa que os assassinatos é a verdade.',
    genres: ['misterio', 'terror', 'suspense'],
    authorName: 'Juliana Costa',
    isPremium: true,
    totalChapters: 12,
    basePrompt: 'Você é um convidado em um jogo mortal de谋杀 e engano em uma mansão isolada. O tom é tenso e perturbador.',
    tone: 'tenso e perturbador',
    styleGuide: 'Descrições atmosféricas com reviravoltas inesperadas.',
    worldRules: 'A mansão é à prova de som e isolada do mundo exterior.',
    openingScene: 'O carro para diante do portão da mansão enquanto a noite cai.',
    characters: [
      { name: 'Você', role: 'PROTAGONIST', description: 'Um convidado com motivos ocultos para aceitar o convite.' },
      { name: 'Victor', role: 'SUPPORTING', description: 'O anfitrião carismático que parece saber muito sobre os outros convidados.' },
      { name: 'Marina', role: 'ANTAGONIST', description: 'Uma mulher que esconde uma obsession fatal.' },
    ],
  },
  {
    title: 'A Última Biblioteca',
    slug: 'a-ultima-biblioteca',
    synopsis: 'Num mundo onde livros são proibidos, Luna é uma contrabandista de histórias. Sua última entrega: um livro que contém a chave para libertar a humanidade — ou condená-la para sempre.',
    genres: ['fantasia', 'aventura', 'ficção-científica'],
    authorName: 'Marcos Lima',
    isPremium: false,
    totalChapters: 15,
    basePrompt: 'Você é Luna, contrabandista de histórias em um mundo distópico. O tom é冒险oso e esperançoso.',
    tone: 'aventureiro e esperançoso',
    styleGuide: 'Narrativa dinâmica com tensão política.',
    worldRules: 'Livros são considerados perigosos e são queimados.',
    openingScene: 'Você esconde um livro antigo na bolsa enquanto guardas se aproximam.',
    characters: [
      { name: 'Luna', role: 'PROTAGONIST', description: 'A última contrabandista de livros.' },
      { name: 'Gregor', role: 'SUPPORTING', description: 'Um guardião do conhecimento antigo.' },
    ],
  },
  {
    title: 'Noite de Halloween',
    slug: 'noite-de-halloween',
    synopsis: 'Cada prédio tem seus fantasmas, mas este é diferente. Quando você se muda para o apartamento 13, você começa a viver as últimas horas de cada pessoa que morreu ali. Para escapar, você deve encontrar o que os mantém presos.',
    genres: ['terror', 'misterio'],
    authorName: 'Sofia Almeida',
    isPremium: false,
    totalChapters: 7,
    basePrompt: 'Você é um novo inquilino em um apartamento assombrado. O tom é aterrorizante e misterioso.',
    tone: 'aterrorizante e misterioso',
    styleGuide: 'Descrições horripilantes com mistérios a serem resolvidos.',
    worldRules: 'O apartamento 13 guarda fantasmas de moradores anteriores.',
    openingScene: 'A chave range na fechadura enquanto você entra no apartamento pela primeira vez.',
    characters: [
      { name: 'Você', role: 'PROTAGONIST', description: 'O novo inquilino com olhos que veem os mortos.' },
      { name: 'O Cuidador', role: 'SUPPORTING', description: 'Uma presença benigna que tenta ajudar.' },
      { name: 'A Sombra', role: 'ANTAGONIST', description: 'A força que mantém as almas presas.' },
    ],
  },
  {
    title: 'O Último Trem',
    slug: 'o-ultimo-trem',
    synopsis: 'Um trem que só aparece à meia-noite. Um passageiro que não deveria existir. Uma jornada que vai mudar o destino de todos a bordo — se vocês conseguirem sobreviver até o destino final.',
    genres: ['suspense', 'terror', 'mistério'],
    authorName: 'Rafael Oliveira',
    isPremium: true,
    totalChapters: 9,
    basePrompt: 'Você é um passageiro em um trem sobrenatural que aparece apenas à meia-noite. O tom é suspense e terror.',
    tone: 'suspense e terror',
    styleGuide: 'Atmosfera claustrofóbica com decisões urgentes.',
    worldRules: 'O trem só existe entre meia-noite e o amanhecer.',
    openingScene: 'Você acorda em um trem vazio e não lembra como chegou lá.',
    characters: [
      { name: 'Você', role: 'PROTAGONIST', description: 'Um passageiro acidental nesta jornada.' },
      { name: 'O Maquinista', role: 'SUPPORTING', description: 'O homem que conduz o trem há séculos.' },
    ],
  },
];

async function main() {
  console.log('🌱 Starting seed...');

  console.log('⚠️  Cleaning existing data...');
  await prisma.adEvent.deleteMany();
  await prisma.modelUsage.deleteMany();
  await prisma.dailyUsageLimit.deleteMany();
  await prisma.narrativeEvent.deleteMany();
  await prisma.readingSession.deleteMany();
  await prisma.storyCharacter.deleteMany();
  await prisma.story.deleteMany();
  await prisma.creditTransaction.deleteMany();
  await prisma.creditWallet.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  console.log('👤 Creating demo users...');
  const passwordHash = await bcrypt.hash('Demo1234!', 12);

  const demoFree = await prisma.user.create({
    data: {
      email: 'demo@enredo.ai',
      name: 'Demo User',
      passwordHash,
      subscription: { create: { type: 'FREE', status: 'ACTIVE' } },
      creditWallet: { create: { balance: 0 } },
    },
  });

  const demoPremium = await prisma.user.create({
    data: {
      email: 'premium@enredo.ai',
      name: 'Premium User',
      passwordHash,
      subscription: { create: { type: 'PREMIUM', status: 'ACTIVE', currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } },
      creditWallet: { create: { balance: 100 } },
    },
  });

  console.log('📚 Creating stories...');
  for (const storyData of STORIES) {
    const { characters, ...story } = storyData;
    
      const createdStory = await prisma.story.create({
        data: {
          ...story,
          genres: story.genres,
          publishedAt: new Date(),
          isBetaVisible: false,
        },
      });

    for (const char of characters) {
      await prisma.storyCharacter.create({
        data: {
          storyId: createdStory.id,
          name: char.name,
          description: char.description,
          role: char.role as CharacterRole,
        },
      });
    }

    console.log(`   ✅ Created: ${story.title}`);
  }

  console.log('✨ Seed completed!');
  console.log('');
  console.log('Demo accounts:');
  console.log('  Free:     demo@enredo.ai / Demo1234!');
  console.log('  Premium:  premium@enredo.ai / Demo1234!');

  // Admin user creation (explicit env vars required)
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    console.log('');
    console.log('👤 Creating admin user...');
    const adminExists = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
    });

    if (adminExists) {
      console.log(`   ℹ️  Admin user already exists: ${ADMIN_EMAIL}`);
    } else {
      const adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
      await prisma.user.create({
        data: {
          email: ADMIN_EMAIL,
          name: 'Admin User',
          passwordHash: adminPasswordHash,
          role: 'ADMIN',
          subscription: {
            create: {
              type: 'FREE',
              status: 'ACTIVE',
            },
          },
          creditWallet: {
            create: {
              balance: 0,
            },
          },
        },
      });
      console.log(`   ✅ Admin user created: ${ADMIN_EMAIL}`);
    }
  } else {
    console.log('');
    console.log('⚠️  Admin seed skipped: ADMIN_EMAIL/ADMIN_PASSWORD not configured.');
  }
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
