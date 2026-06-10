/**
 * Curated fallback for beta catalog character readiness.
 *
 * This script intentionally avoids AI providers. It fills the remaining known
 * beta premises that provider quota/invalid JSON left with fewer than 3
 * playable characters.
 *
 * Usage:
 *   npm run catalog:beta:curate-missing-characters -- --dry-run
 *   npm run catalog:beta:curate-missing-characters -- --apply
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { GenerationStatus, NarrativeFunction, PrismaClient } from '@prisma/client';
import { normalizeRuntimeDatabaseUrl } from '../src/common/database-url';

const isDryRun = process.argv.includes('--dry-run');
const isApply = process.argv.includes('--apply');
const MIN_CHARACTERS = 3;

const catalogDatabaseUrl = normalizeRuntimeDatabaseUrl(process.env.DATABASE_URL);
const prisma = catalogDatabaseUrl
  ? new PrismaClient({ log: ['error'], datasources: { db: { url: catalogDatabaseUrl } } })
  : new PrismaClient({ log: ['error'] });

type CuratedCharacter = {
  name: string;
  roleLabel: string;
  narrativeFunction: NarrativeFunction;
  description: string;
  personality: string;
  motivation: string;
  secret: string;
  relationshipToPlayer: string;
  initialGoal: string;
  startingSituation: string;
  conflictPotential: string;
  visualPrompt: string;
};

type CuratedPremise = {
  storyTitle: string;
  premiseTitle: string;
  characters: CuratedCharacter[];
};

const curatedPremises: CuratedPremise[] = [
  {
    storyTitle: 'Sabores em Conflito',
    premiseTitle: 'O Ingrediente Secreto',
    characters: [
      {
        name: 'Helena Duarte',
        roleLabel: 'A chef que herdou uma receita perigosa',
        narrativeFunction: NarrativeFunction.HERO,
        description: 'Uma cozinheira precisa decidir se revela o ingrediente que salvou o restaurante ou enterra a verdade que pode destruir sua familia.',
        personality: 'Intuitiva, orgulhosa e vulneravel quando alguem questiona seu talento.',
        motivation: 'Salvar o restaurante sem repetir os erros da mae.',
        secret: 'Sabe que o ingrediente secreto veio de uma chantagem antiga.',
        relationshipToPlayer: 'A propria protagonista, dividida entre ambicao, culpa e desejo.',
        initialGoal: 'Apresentar o prato final antes que o segredo vaze.',
        startingSituation: 'Encontra uma carta escondida dentro do antigo livro de receitas.',
        conflictPotential: 'Pode mentir para proteger o sonho ou confessar e perder tudo.',
        visualPrompt: 'Brazilian woman chef in her late twenties, intense eyes, cream apron, warm restaurant kitchen, cinematic editorial portrait',
      },
      {
        name: 'Rafael Monteiro',
        roleLabel: 'O critico que conhece o gosto da mentira',
        narrativeFunction: NarrativeFunction.RIVAL,
        description: 'Um critico gastronomico elegante, perigoso e atento demais aos detalhes que todos tentam esconder.',
        personality: 'Sedutor, ironico, paciente e impossivel de impressionar facilmente.',
        motivation: 'Descobrir se Helena e genial ou apenas herdeira de uma fraude.',
        secret: 'Foi apaixonado pela mae de Helena e sabe parte da historia do ingrediente.',
        relationshipToPlayer: 'Rival magnetico; desafia a protagonista enquanto desperta curiosidade e desejo.',
        initialGoal: 'Forcar Helena a cozinhar sem esconder nada.',
        startingSituation: 'Chega antes do horario da avaliacao e pede para ver a despensa proibida.',
        conflictPotential: 'Pode virar aliado intimo ou publicar uma critica devastadora.',
        visualPrompt: 'Elegant Brazilian food critic, early forties, dark suit, controlled smile, restaurant shadows, cinematic portrait',
      },
      {
        name: 'Tereza Valim',
        roleLabel: 'A sous-chef que sabe cortar fundo',
        narrativeFunction: NarrativeFunction.SHADOW,
        description: 'Braço direito do restaurante, leal ate o ponto em que a lealdade comeca a parecer vinganca.',
        personality: 'Pratica, ciumenta, brilhante sob pressao e ferozmente protetora.',
        motivation: 'Provar que tambem merece assinar o futuro do restaurante.',
        secret: 'Trocou uma pagina do livro de receitas para testar Helena.',
        relationshipToPlayer: 'Aliada instavel; ajuda na cozinha, mas disputa reconhecimento.',
        initialGoal: 'Manter a cozinha funcionando enquanto mede a fraqueza da protagonista.',
        startingSituation: 'Segura a faca de chef de Helena e pergunta se ela realmente quer saber a verdade.',
        conflictPotential: 'Pode salvar a noite ou sabotar o prato final.',
        visualPrompt: 'Sharp sous-chef woman, short dark hair, chef jacket, knife in hand, moody kitchen light, editorial portrait',
      },
    ],
  },
  {
    storyTitle: 'Brilho da Traição',
    premiseTitle: 'O Preço da Fama',
    characters: [
      {
        name: 'Bianca Vale',
        roleLabel: 'A estrela que cansou de sorrir para as cameras',
        narrativeFunction: NarrativeFunction.HERO,
        description: 'Uma celebridade em ascensao percebe que sua imagem publica virou uma prisao cuidadosamente iluminada.',
        personality: 'Carismatica, impulsiva e mais esperta do que seus agentes imaginam.',
        motivation: 'Recuperar controle sobre a propria carreira e sobre o proprio desejo.',
        secret: 'Planeja abandonar o contrato milionário depois da estreia.',
        relationshipToPlayer: 'A propria protagonista, pressionada por fama, culpa e paixao.',
        initialGoal: 'Descobrir quem vendeu sua vida privada para a imprensa.',
        startingSituation: 'Entra no camarim e encontra manchetes impressas antes da coletiva.',
        conflictPotential: 'Pode explodir a propria carreira para descobrir quem a traiu.',
        visualPrompt: 'Brazilian pop star actress, glamorous silver dress, backstage mirror lights, tense expression, cinematic portrait',
      },
      {
        name: 'Noah Brandão',
        roleLabel: 'O empresario que vende promessas em voz baixa',
        narrativeFunction: NarrativeFunction.GUARDIAN,
        description: 'O homem que protege a carreira de Bianca tambem controla todas as portas por onde ela tenta fugir.',
        personality: 'Frio, calculista, elegante e estranhamente cuidadoso quando ninguem ve.',
        motivation: 'Preservar o contrato que transformou Bianca em fenomeno.',
        secret: 'Sabe quem vazou as fotos, mas teme que a verdade seja pior que o escandalo.',
        relationshipToPlayer: 'Protetor controlador; mistura poder, tensao e dependencia emocional.',
        initialGoal: 'Impedir Bianca de falar sem roteiro.',
        startingSituation: 'Tranca a porta do camarim e entrega um discurso pronto.',
        conflictPotential: 'Pode ser escudo, carcereiro ou o homem que finalmente perde o controle.',
        visualPrompt: 'Powerful talent manager, tailored black suit, backstage corridor, controlled expression, cinematic portrait',
      },
      {
        name: 'Cora Lins',
        roleLabel: 'A jornalista que sabe onde a luz nao chega',
        narrativeFunction: NarrativeFunction.TRICKSTER,
        description: 'Uma repórter de entretenimento que parece vender fofoca, mas procura uma historia muito maior.',
        personality: 'Rapida, provocadora, brilhante e moralmente flexivel.',
        motivation: 'Publicar a materia que vai derrubar a agencia de Noah.',
        secret: 'Tem uma fonte dentro da equipe pessoal de Bianca.',
        relationshipToPlayer: 'Ameaça e oportunidade; oferece verdade em troca de acesso.',
        initialGoal: 'Convencer Bianca a dar uma entrevista sem assessoria.',
        startingSituation: 'Aparece no estacionamento com um gravador ligado e uma pergunta certeira.',
        conflictPotential: 'Pode destruir a reputacao da protagonista ou libertá-la.',
        visualPrompt: 'Investigative entertainment journalist, red blazer, phone recorder, city night, confident stare, cinematic portrait',
      },
    ],
  },
  {
    storyTitle: 'Lua de Sangue no Corte das Sombras',
    premiseTitle: 'A Sombra e a Promessa',
    characters: [
      {
        name: 'Serena Valdris',
        roleLabel: 'A prometida que ouviu a sombra chamar seu nome',
        narrativeFunction: NarrativeFunction.HERO,
        description: 'Uma nobre marcada por uma promessa antiga precisa escolher entre o dever do trono e a voz que acorda dentro dela.',
        personality: 'Orgulhosa, sensivel a pressagios e perigosa quando subestimada.',
        motivation: 'Quebrar o juramento que a prende ao corte sem condenar seu povo.',
        secret: 'Carrega uma sombra viva ligada ao sangue da lua.',
        relationshipToPlayer: 'A propria protagonista, dividida entre coroa, desejo e destino.',
        initialGoal: 'Descobrir quem invocou a sombra durante a cerimonia.',
        startingSituation: 'A lua fica vermelha no instante em que Serena aceita o anel real.',
        conflictPotential: 'Pode trair o pacto, aceitar a sombra ou usar ambos contra a corte.',
        visualPrompt: 'Dark fantasy noblewoman, moonlit crimson court, black gown, silver tiara, cinematic portrait',
      },
      {
        name: 'Kael Morvant',
        roleLabel: 'O principe que sorri como uma ameaça',
        narrativeFunction: NarrativeFunction.RIVAL,
        description: 'Herdeiro da corte das sombras, Kael sabe transformar ternura em arma politica.',
        personality: 'Sedutor, implacavel, divertido quando esta vencendo.',
        motivation: 'Garantir o casamento e usar a marca de Serena para fortalecer o reino.',
        secret: 'Tambem teme a entidade presa ao sangue da noiva.',
        relationshipToPlayer: 'Noivo perigoso; desperta tensao, raiva e uma atracao desconfortavel.',
        initialGoal: 'Conduzir Serena ao juramento final antes do amanhecer.',
        startingSituation: 'Sussurra que pode protegê-la, mas apenas se ela pertencer a ele.',
        conflictPotential: 'Pode se tornar inimigo, amante ou carcereiro coroado.',
        visualPrompt: 'Shadow prince, black embroidered coat, pale eyes, red moon throne room, cinematic portrait',
      },
      {
        name: 'Mirella Noctis',
        roleLabel: 'A dama de companhia que serve a duas rainhas',
        narrativeFunction: NarrativeFunction.HARBINGER,
        description: 'A confidente de Serena conhece a linguagem das sombras e entende o preço das promessas reais.',
        personality: 'Doce na superficie, observadora, supersticiosa e leal ao que considera inevitavel.',
        motivation: 'Impedir que Serena seja sacrificada pela rainha mae.',
        secret: 'Foi enviada pela antiga rainha exilada para vigiar a protagonista.',
        relationshipToPlayer: 'Conselheira ambigua; protege enquanto manipula pequenos caminhos.',
        initialGoal: 'Tirar Serena do baile antes que o juramento seja selado.',
        startingSituation: 'Aparece com as maos manchadas de cinza e pede que Serena nao confie no noivo.',
        conflictPotential: 'Pode revelar uma rota de fuga ou conduzir a protagonista a outro pacto.',
        visualPrompt: 'Mysterious lady-in-waiting, dark veil, candlelit palace corridor, secretive expression, cinematic portrait',
      },
    ],
  },
  {
    storyTitle: 'Lua de Sangue no Corte das Sombras',
    premiseTitle: 'Ecos na Penumbra',
    characters: [
      {
        name: 'Lyria Voss',
        roleLabel: 'A cortesã que escuta mortos nas paredes',
        narrativeFunction: NarrativeFunction.HERO,
        description: 'Uma mulher criada entre intrigas descobre que os ecos da penumbra respondem apenas quando ela mente.',
        personality: 'Astuta, teatral, desconfiada e secretamente solitaria.',
        motivation: 'Usar os ecos para descobrir quem matou sua irma.',
        secret: 'A irma morta talvez esteja presa dentro de sua propria sombra.',
        relationshipToPlayer: 'A propria protagonista, navegando desejo, luto e ambicao.',
        initialGoal: 'Roubar uma confissao durante o baile da lua escarlate.',
        startingSituation: 'O espelho do salao repete uma frase que Lyria nunca disse em voz alta.',
        conflictPotential: 'Pode manipular todos ao redor ou ser consumida pelas vozes que invoca.',
        visualPrompt: 'Dark fantasy court woman, burgundy dress, haunted mirror, candle smoke, cinematic portrait',
      },
      {
        name: 'Dorian Cael',
        roleLabel: 'O espião que transforma silencio em promessa',
        narrativeFunction: NarrativeFunction.ALLY,
        description: 'Um espião da corte baixa, treinado para desaparecer, mas incapaz de ignorar Lyria.',
        personality: 'Reservado, mordaz, protetor e leal apenas depois de testar todos os riscos.',
        motivation: 'Descobrir quem vendeu a corte aos seres da penumbra.',
        secret: 'Foi contratado para vigiar Lyria antes de decidir ajuda-la.',
        relationshipToPlayer: 'Aliado de confiança lenta; tensão romantica nasce da desconfiança.',
        initialGoal: 'Impedir Lyria de seguir o eco errado.',
        startingSituation: 'Surge atras da cortina segundos antes de uma tentativa de envenenamento.',
        conflictPotential: 'Pode salvar a protagonista ou entregar seu segredo para sobreviver.',
        visualPrompt: 'Court spy, leather coat, hidden dagger, moonlit velvet curtains, cinematic portrait',
      },
      {
        name: 'Rainha Maereth',
        roleLabel: 'A soberana que alimenta a penumbra',
        narrativeFunction: NarrativeFunction.VILLAIN,
        description: 'A rainha governa com etiqueta impecavel e um pacto antigo que exige sacrificios discretos.',
        personality: 'Controlada, maternal quando convem e cruel sem levantar a voz.',
        motivation: 'Manter a corte viva mesmo que precise entregar mais uma alma.',
        secret: 'Os ecos sao restos das pessoas que ela ofereceu ao trono.',
        relationshipToPlayer: 'Antagonista elegante; trata a protagonista como peça rara de tabuleiro.',
        initialGoal: 'Fazer Lyria confessar seu dom diante da corte.',
        startingSituation: 'Convida Lyria para dançar enquanto os mortos sussurram sob o piso.',
        conflictPotential: 'Pode transformar a protagonista em herdeira, sacrificio ou inimiga publica.',
        visualPrompt: 'Dark queen, obsidian crown, red moon ballroom, serene cruel face, cinematic portrait',
      },
    ],
  },
  {
    storyTitle: 'O Segredo Entre as Páginas',
    premiseTitle: 'O Segredo das Cartas Anônimas',
    characters: [
      {
        name: 'Clara Azevedo',
        roleLabel: 'A livreira que recebe cartas para uma mulher morta',
        narrativeFunction: NarrativeFunction.HERO,
        description: 'Dona de uma livraria pequena, Clara começa a receber cartas anonimas que reescrevem seu passado.',
        personality: 'Curiosa, contida, romantica contra a propria vontade.',
        motivation: 'Descobrir quem conhece detalhes de sua vida que ela nunca contou.',
        secret: 'Guarda uma carta antiga que nunca teve coragem de abrir.',
        relationshipToPlayer: 'A propria protagonista, presa entre memória e novo desejo.',
        initialGoal: 'Identificar o remetente antes da proxima entrega.',
        startingSituation: 'Uma carta sem selo aparece dentro de um romance que ninguem comprou.',
        conflictPotential: 'Pode seguir o rastro das cartas ou destruir a unica pista sobre sua historia.',
        visualPrompt: 'Brazilian bookstore owner, cozy old bookstore, anonymous letter, soft dramatic light, cinematic portrait',
      },
      {
        name: 'Teo Albuquerque',
        roleLabel: 'O escritor que inventa verdades perigosas',
        narrativeFunction: NarrativeFunction.RIVAL,
        description: 'Um romancista famoso se aproxima da livraria e parece saber demais sobre as cartas anonimas.',
        personality: 'Encantador, evasivo, brilhante e irritantemente calmo.',
        motivation: 'Terminar um livro inspirado em uma verdade que prometeu esconder.',
        secret: 'Conheceu a mulher morta que assinava as primeiras cartas.',
        relationshipToPlayer: 'Rival intelectual e interesse romantico cheio de zonas cinzentas.',
        initialGoal: 'Convencer Clara a confiar nele antes que outra pessoa encontre as cartas.',
        startingSituation: 'Aparece para autografar livros e deixa uma frase identica a da carta.',
        conflictPotential: 'Pode ser protetor, impostor ou o autor da manipulacao.',
        visualPrompt: 'Charismatic Brazilian writer, linen shirt, bookstore shelves, unreadable smile, cinematic portrait',
      },
      {
        name: 'Irene Bastos',
        roleLabel: 'A vizinha que sabe demais sobre fechaduras',
        narrativeFunction: NarrativeFunction.TRICKSTER,
        description: 'Uma aposentada espirituosa que conhece todos os boatos da rua e algumas verdades que ninguem publicou.',
        personality: 'Intrometida, afiada, afetuosa e teatral.',
        motivation: 'Proteger Clara de repetir o destino da antiga dona da livraria.',
        secret: 'Escondeu a primeira carta anonima ha vinte anos.',
        relationshipToPlayer: 'Aliada bisbilhoteira; ajuda com humor e omissoes calculadas.',
        initialGoal: 'Levar Clara ate o porao antigo da livraria.',
        startingSituation: 'Entrega uma chave enferrujada e diz que toda carta precisa de uma porta.',
        conflictPotential: 'Pode revelar pistas no tempo certo ou atrasar a verdade por medo.',
        visualPrompt: 'Elderly Brazilian woman, colorful scarf, antique key, warm bookstore doorway, cinematic portrait',
      },
    ],
  },
  {
    storyTitle: 'O Segredo Entre as Páginas',
    premiseTitle: 'O Jogo dos Pseudônimos',
    characters: [
      {
        name: 'Laura Nobre',
        roleLabel: 'A autora que publicou o amor de outra pessoa',
        narrativeFunction: NarrativeFunction.HERO,
        description: 'Uma escritora descobre que seu pseudonimo foi usado para publicar uma confissao que pode arruinar sua vida.',
        personality: 'Elegante, ansiosa, sarcastica quando acuada.',
        motivation: 'Recuperar o controle da propria voz antes do lançamento.',
        secret: 'Seu pseudonimo nasceu de uma historia de amor que ela nunca superou.',
        relationshipToPlayer: 'A propria protagonista, dividida entre fama literaria e intimidade roubada.',
        initialGoal: 'Descobrir quem escreveu o capitulo final em seu nome.',
        startingSituation: 'Recebe a prova impressa de um livro que nao terminou de escrever.',
        conflictPotential: 'Pode revelar sua identidade secreta ou deixar alguem contar sua historia.',
        visualPrompt: 'Brazilian novelist, elegant black dress, manuscript pages, literary event lights, cinematic portrait',
      },
      {
        name: 'Miguel Salles',
        roleLabel: 'O editor que reconhece cada mentira bonita',
        narrativeFunction: NarrativeFunction.SKEPTIC,
        description: 'Editor experiente e sedutor, Miguel sabe quando Laura esta escondendo mais do que erros de revisao.',
        personality: 'Paciente, provocador, culto e emocionalmente dificil de ler.',
        motivation: 'Salvar o livro e descobrir se Laura ainda confia nele.',
        secret: 'Guardou cartas antigas entre os originais rejeitados dela.',
        relationshipToPlayer: 'Ex-aliado intimo; mistura passado mal resolvido e risco profissional.',
        initialGoal: 'Impedir que Laura cancele o lançamento sem explicar a verdade.',
        startingSituation: 'Fecha a sala da editora e coloca duas versões do livro sobre a mesa.',
        conflictPotential: 'Pode proteger a protagonista ou usar a verdade para prende-la ao contrato.',
        visualPrompt: 'Sophisticated book editor, dark glasses, manuscript table, publishing office at night, cinematic portrait',
      },
      {
        name: 'Nina Ferraz',
        roleLabel: 'A ghostwriter que virou fantasma real',
        narrativeFunction: NarrativeFunction.SHADOW,
        description: 'Uma escritora invisivel que conhece o tom de Laura bem demais para ser apenas uma imitadora.',
        personality: 'Ferina, talentosa, ressentida e desesperada por reconhecimento.',
        motivation: 'Ser vista depois de anos escrevendo para nomes famosos.',
        secret: 'Foi contratada por alguem proximo a Laura para finalizar o livro.',
        relationshipToPlayer: 'Espelho sombrio; entende a protagonista e ameaça substitui-la.',
        initialGoal: 'Forcar Laura a admitir quem realmente escreveu suas melhores paginas.',
        startingSituation: 'Envia um bilhete com uma frase que Laura pensou, mas nunca digitou.',
        conflictPotential: 'Pode virar parceira criativa ou destruir a autoria da protagonista.',
        visualPrompt: 'Young ghostwriter, messy desk, ink-stained fingers, neon city window, cinematic portrait',
      },
    ],
  },
  {
    storyTitle: 'Sombras da Estante Eterna',
    premiseTitle: 'O Contrato da Lâmina de Tinta',
    characters: [
      {
        name: 'Maia Serrat',
        roleLabel: 'A bibliotecária que assinou com tinta viva',
        narrativeFunction: NarrativeFunction.HERO,
        description: 'Guardia da Estante Eterna, Maia descobre que seu contrato pode cortar destinos como uma lâmina.',
        personality: 'Metodica, corajosa, ironica e secretamente fascinada pelo proibido.',
        motivation: 'Quebrar um contrato antes que ele escreva sua morte.',
        secret: 'A tinta viva responde ao sangue dela.',
        relationshipToPlayer: 'A propria protagonista, tentando controlar um poder que a deseja de volta.',
        initialGoal: 'Encontrar a clausula escondida antes da meia-noite.',
        startingSituation: 'Uma pena negra risca sozinha o nome de Maia no contrato.',
        conflictPotential: 'Pode usar a lâmina de tinta para libertar outros ou ferir quem ama.',
        visualPrompt: 'Fantasy librarian, enchanted library, living ink blade, dark green cloak, cinematic portrait',
      },
      {
        name: 'Eron Vale',
        roleLabel: 'O advogado dos livros que cobram sangue',
        narrativeFunction: NarrativeFunction.GUARDIAN,
        description: 'Um jurista arcano que entende contratos magicos e cobra verdades em vez de moedas.',
        personality: 'Preciso, sedutor, austero e surpreendentemente leal a regras antigas.',
        motivation: 'Impedir Maia de quebrar uma lei que sustenta a biblioteca.',
        secret: 'Ja perdeu alguem para a mesma cláusula.',
        relationshipToPlayer: 'Guardiao e obstaculo; protege a protagonista sem dar liberdade total.',
        initialGoal: 'Convencer Maia a aceitar uma renegociacao perigosa.',
        startingSituation: 'Surge entre estantes fechadas com o contrato original nas maos.',
        conflictPotential: 'Pode salvar Maia legalmente ou prende-la a uma pena pior.',
        visualPrompt: 'Arcane lawyer, dark waistcoat, glowing contract, endless library shelves, cinematic portrait',
      },
      {
        name: 'Sibil Arquen',
        roleLabel: 'A leitora que apaga nomes para sobreviver',
        narrativeFunction: NarrativeFunction.TRICKSTER,
        description: 'Uma ladra de paginas raras que conhece atalhos pela Estante Eterna e nao deve favores de graca.',
        personality: 'Risonha, imprevisivel, oportunista e mais sentimental do que admite.',
        motivation: 'Roubar a lâmina de tinta para apagar sua propria condenacao.',
        secret: 'Seu nome verdadeiro ja foi arrancado de todos os registros.',
        relationshipToPlayer: 'Aliada instavel; flerta com o perigo e com a protagonista.',
        initialGoal: 'Guiar Maia ate o indice proibido em troca de uma promessa.',
        startingSituation: 'Cai de uma prateleira alta carregando paginas que gritam.',
        conflictPotential: 'Pode trair, salvar ou pedir algo que Maia nao pode pagar.',
        visualPrompt: 'Rogue magical reader, short curls, stolen pages, glowing shelves, playful dangerous expression, cinematic portrait',
      },
    ],
  },
  {
    storyTitle: 'Sombras da Estante Eterna',
    premiseTitle: 'Sombras no Corredor dos Sussurros',
    characters: [
      {
        name: 'Nara Belmonte',
        roleLabel: 'A visitante que entrou procurando a propria voz',
        narrativeFunction: NarrativeFunction.HERO,
        description: 'Uma cantora sem voz segue sussurros pela biblioteca e descobre que cada corredor guarda uma versao dela.',
        personality: 'Sensivel, teimosa, intuitiva e assustada com o proprio desejo de poder.',
        motivation: 'Recuperar a voz roubada antes que outra pessoa cante sua vida.',
        secret: 'Ofereceu uma canção a biblioteca quando era criança.',
        relationshipToPlayer: 'A propria protagonista, lutando para ser ouvida sem ser possuida.',
        initialGoal: 'Seguir o sussurro que repete seu nome de nascimento.',
        startingSituation: 'O corredor responde com uma melodia que so Nara conhece.',
        conflictPotential: 'Pode recuperar a voz, perder a identidade ou trocar uma pela outra.',
        visualPrompt: 'Brazilian singer in mystical library corridor, hand at throat, floating dust, cinematic portrait',
      },
      {
        name: 'Orfeu Lira',
        roleLabel: 'O músico preso entre duas notas',
        narrativeFunction: NarrativeFunction.ALLY,
        description: 'Um violinista fantasma habita o corredor e reconhece em Nara a unica pessoa capaz de escuta-lo por inteiro.',
        personality: 'Melancolico, elegante, gentil e dramatico.',
        motivation: 'Terminar a musica que o libertaria da Estante Eterna.',
        secret: 'Foi ele quem ajudou a biblioteca a roubar vozes anos atras.',
        relationshipToPlayer: 'Aliado encantador; inspira confiança enquanto carrega culpa.',
        initialGoal: 'Ensinar Nara a responder aos sussurros sem se perder.',
        startingSituation: 'Toca uma nota invisivel que abre uma porta entre prateleiras.',
        conflictPotential: 'Pode libertar Nara ou trocar a voz dela pela propria liberdade.',
        visualPrompt: 'Ghost violinist, old formal suit, translucent hands, magical library corridor, cinematic portrait',
      },
      {
        name: 'Dama Sem Eco',
        roleLabel: 'A sombra que coleciona vozes bonitas',
        narrativeFunction: NarrativeFunction.VILLAIN,
        description: 'Uma entidade silenciosa que transforma confissoes em cancoes e cancoes em correntes.',
        personality: 'Serena, predatoria, paciente e quase maternal.',
        motivation: 'Completar o coral de vozes perdidas da biblioteca.',
        secret: 'So pode possuir quem canta por vontade propria.',
        relationshipToPlayer: 'Antagonista sedutora; oferece poder em troca de rendicao.',
        initialGoal: 'Convencer Nara a cantar uma unica nota.',
        startingSituation: 'Aparece como uma mulher feita de sombra atras de um vitral rachado.',
        conflictPotential: 'Pode roubar a voz, revelar verdades ou oferecer uma tentacao irresistivel.',
        visualPrompt: 'Shadow woman, no reflection, cracked stained glass, endless whispering hallway, cinematic portrait',
      },
    ],
  },
  {
    storyTitle: 'Marcas da Lua Escarlate',
    premiseTitle: 'A Fenda do Pacto',
    characters: [
      {
        name: 'Ayla Ferraz',
        roleLabel: 'A marcada que sente a lua abrir na pele',
        narrativeFunction: NarrativeFunction.HERO,
        description: 'Ayla carrega uma marca escarlate que reage ao pacto antigo entre sua familia e o cla dos lobos.',
        personality: 'Instintiva, desconfiada, intensa e ferozmente protetora.',
        motivation: 'Entender se a marca e maldição, herança ou chamado.',
        secret: 'A fenda do pacto se abriu porque ela desejou fugir.',
        relationshipToPlayer: 'A propria protagonista, dividida entre liberdade e pertencimento.',
        initialGoal: 'Chegar ao circulo de pedra antes da proxima transformação.',
        startingSituation: 'A marca queima quando um uivo atravessa a janela.',
        conflictPotential: 'Pode quebrar o pacto, liderar o cla ou entregar-se a uma força antiga.',
        visualPrompt: 'Young Brazilian woman with subtle red moon mark, forest night, intense gaze, cinematic portrait',
      },
      {
        name: 'Gael Arantes',
        roleLabel: 'O alfa que nao pode admitir medo',
        narrativeFunction: NarrativeFunction.RIVAL,
        description: 'Lider do cla, Gael ve em Ayla a ameaça e a chave para manter todos vivos.',
        personality: 'Dominante, contido, protetor e vulneravel quando esta sozinho.',
        motivation: 'Fechar a fenda antes que criaturas antigas retornem.',
        secret: 'A marca de Ayla responde tambem ao sangue dele.',
        relationshipToPlayer: 'Rival magnetico; tensão de poder, desejo e confiança dificil.',
        initialGoal: 'Levar Ayla ao ritual mesmo contra a vontade dela.',
        startingSituation: 'Surge na estrada molhada dizendo que ela nao tem mais tempo.',
        conflictPotential: 'Pode proteger, controlar ou se ajoelhar diante da escolha dela.',
        visualPrompt: 'Dark-haired wolf clan alpha, leather jacket, rain forest road, amber eyes, cinematic portrait',
      },
      {
        name: 'Bruna Salles',
        roleLabel: 'A curandeira que costura pactos com dor',
        narrativeFunction: NarrativeFunction.MENTOR,
        description: 'Conhecedora de ervas, sangue e memoria, Bruna entende que nem todo pacto deve ser salvo.',
        personality: 'Direta, maternal sem doçura, supersticiosa e corajosa.',
        motivation: 'Evitar que Ayla vire moeda de troca entre clãs.',
        secret: 'Foi ela quem escondeu a origem real da marca.',
        relationshipToPlayer: 'Mentora dura; protege Ayla mesmo quando mente para ela.',
        initialGoal: 'Preparar um ritual alternativo antes da assembleia do cla.',
        startingSituation: 'Mistura cinzas lunares e pede que Ayla escolha entre dor e verdade.',
        conflictPotential: 'Pode guiar a protagonista ou revelar uma mentira imperdoavel.',
        visualPrompt: 'Wolf clan healer woman, herbs and red ash, moonlit cabin, wise stern face, cinematic portrait',
      },
    ],
  },
  {
    storyTitle: 'Marcas da Lua Escarlate',
    premiseTitle: 'O Legado das Marcas',
    characters: [
      {
        name: 'Isadora Venn',
        roleLabel: 'A herdeira das marcas proibidas',
        narrativeFunction: NarrativeFunction.HERO,
        description: 'Isadora descobre que as marcas em sua pele formam um mapa para o legado que todos os clãs temem.',
        personality: 'Analitica, orgulhosa, apaixonada por respostas e ruim em pedir ajuda.',
        motivation: 'Reivindicar o legado antes que ele seja usado contra ela.',
        secret: 'Uma das marcas pertence a uma linhagem inimiga.',
        relationshipToPlayer: 'A propria protagonista, tentando transformar vergonha em poder.',
        initialGoal: 'Decifrar a primeira marca antes do conselho lunar.',
        startingSituation: 'Um simbolo novo aparece em sua clavicula durante um eclipse escarlate.',
        conflictPotential: 'Pode unir clãs, iniciar uma guerra ou negar o proprio sangue.',
        visualPrompt: 'Romantasy heroine with red lunar markings, ancient map room, candlelight, cinematic portrait',
      },
      {
        name: 'Enzo Ravena',
        roleLabel: 'O guardião que jurou matar a herdeira errada',
        narrativeFunction: NarrativeFunction.GUARDIAN,
        description: 'Treinado para proteger o legado de mãos impuras, Enzo precisa decidir se Isadora e ameaça ou rainha.',
        personality: 'Disciplinado, intenso, honrado e perigosamente dividido.',
        motivation: 'Cumprir o juramento sem condenar uma inocente.',
        secret: 'Seu juramento exige que ele mate quem carregar a marca inimiga.',
        relationshipToPlayer: 'Guardião hostil; aproxima-se pela necessidade e pela atração proibida.',
        initialGoal: 'Testar Isadora antes que o conselho descubra todas as marcas.',
        startingSituation: 'Aparece no quarto dela com uma lâmina encostada no proprio pulso, nao no dela.',
        conflictPotential: 'Pode se tornar escudo, executor ou aliado apaixonado.',
        visualPrompt: 'Romantasy guardian, dark armor, red moon blade, conflicted expression, cinematic portrait',
      },
      {
        name: 'Madre Celina',
        roleLabel: 'A matriarca que escreveu o legado em sangue',
        narrativeFunction: NarrativeFunction.SHADOW,
        description: 'Ultima guardia da velha ordem, Celina trata Isadora como neta e arma ao mesmo tempo.',
        personality: 'Afetuosa, manipuladora, religiosa e implacavel com fraqueza.',
        motivation: 'Garantir que o legado sobreviva, custe o que custar.',
        secret: 'Escolheu Isadora para carregar a marca proibida ainda bebe.',
        relationshipToPlayer: 'Autoridade familiar; oferece amor condicionado a obediencia.',
        initialGoal: 'Levar Isadora ao altar das marcas antes que Enzo descubra tudo.',
        startingSituation: 'Entrega um vestido branco e pede perdao antes de explicar o motivo.',
        conflictPotential: 'Pode ser mentora, carcereira ou a verdadeira antagonista do legado.',
        visualPrompt: 'Powerful elderly matriarch, white ceremonial dress, red moon altar, solemn face, cinematic portrait',
      },
    ],
  },
];

async function main() {
  if (!isDryRun && !isApply) {
    console.error('Specify --dry-run or --apply.');
    process.exit(1);
  }

  if ((process.env.NODE_ENV || '') === 'production') {
    console.error('This script is for local/dev beta catalog operations only.');
    process.exit(1);
  }

  console.log('Enredo.ai — Curated Beta Missing Characters');
  console.log(`Mode: ${isApply ? 'APPLY' : 'DRY-RUN'}\n`);

  let created = 0;
  let skipped = 0;
  const missing: string[] = [];

  for (const entry of curatedPremises) {
    const premise = await prisma.storyPremise.findFirst({
      where: {
        title: entry.premiseTitle,
        story: {
          title: entry.storyTitle,
          isBetaVisible: true,
        },
      },
      include: {
        story: { select: { title: true } },
        characters: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!premise) {
      missing.push(`${entry.storyTitle} / ${entry.premiseTitle}`);
      console.log(`❌ Missing premise: "${entry.storyTitle}" / "${entry.premiseTitle}"`);
      continue;
    }

    const currentCount = premise.characters.length;
    if (currentCount >= MIN_CHARACTERS) {
      skipped += 1;
      console.log(`⏭️  "${entry.storyTitle}" / "${entry.premiseTitle}" already playable (${currentCount}/3).`);
      continue;
    }

    if (currentCount > 0) {
      console.log(`⚠️  "${entry.storyTitle}" / "${entry.premiseTitle}" has partial cast (${currentCount}/3); skipped to avoid mixing casts.`);
      skipped += 1;
      continue;
    }

    console.log(`🔧 "${entry.storyTitle}" / "${entry.premiseTitle}" — creating 3 curated characters.`);

    if (isApply) {
      await prisma.$transaction(
        entry.characters.map((character, index) =>
          prisma.storyPlayableCharacter.create({
            data: {
              premiseId: premise.id,
              name: character.name,
              roleLabel: character.roleLabel,
              narrativeFunction: character.narrativeFunction,
              description: character.description,
              personality: character.personality,
              motivation: character.motivation,
              secret: character.secret,
              relationshipToPlayer: character.relationshipToPlayer,
              initialGoal: character.initialGoal,
              startingSituation: character.startingSituation,
              conflictPotential: character.conflictPotential,
              visualPrompt: character.visualPrompt,
              imageGenerationStatus: GenerationStatus.NOT_REQUESTED,
              imageError: null,
              sortOrder: index,
              isPremium: false,
              isAiGenerated: false,
            },
          }),
        ),
      );
    }
    created += entry.characters.length;
  }

  console.log('\nSummary');
  console.log(`  Characters ${isApply ? 'created' : 'to create'}: ${created}`);
  console.log(`  Premises skipped: ${skipped}`);
  console.log(`  Premises missing: ${missing.length}`);

  if (missing.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
