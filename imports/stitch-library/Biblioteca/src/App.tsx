/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Search, Library, BookOpen, Film, PlusCircle, User, BookCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';

const ORIGINALS = [
  {
    id: 1,
    title: 'O Silêncio dos Arcanos',
    genre: 'MISTÉRIO NOIR',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCWpQGrK-ROgnT98Bo5bebrpPIkPeMW2_-NbklS6nZtJ4m4B_QQ9_4-373701zZ8O7Z7zr-zUlNpt_oLHK5weycZJp_G4SuwAa7ZKzFIICRC1Pz1j8VdUsKZTptFFYDr3FJ7oczP2uQ3i0KCSNN4ePImoTTFyadHacBG5JHfJUAnu9tau1BAfsmlmQkZg202fKeGbxOYmcxPyhtFZ-VtJoSsh0bB0zH7mvYAim4sfxnpvmz3FRjvPQi4sWeajsK7E0aK-vW0MITfls',
    tag: 'ORIGINAL'
  },
  {
    id: 2,
    title: 'Caminhos de Éter',
    genre: 'FANTASIA ÉPICA',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDuEuln-CAt-dRtAtq_vNlmW4j_oWWZZVIQgTR4NQp2x2ORQ-BYlPTIBkqqQDY5sDDa6UVmKqwu5eRySKj3sZH2ZyXIAHagHjflSosTTR-rqzDEYz9GmqEy0JGY0VtgY9h3fuRsijuwL7EpZiHMNKOt1WlmSKFDz3TQiaaI6pF13JCiztKvsMy2xxsfWZjtE__NsAk1p6vel-_GfRQn4pdd0rw-UKRykPyLwNsvG-gAVG2MPMWrbbH45--nBPm8ShbytDhjC2CfE-4',
    tag: 'ORIGINAL'
  }
];

const COMMUNITY = [
  {
    id: 1,
    title: 'Vozes do Sótão',
    genre: 'SUSPENSE',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAVz2ci07ZJoLywZLvvDDtBJALiwI9obxvHsOsHhRGy4AsGYUKMLTN2HodIv1SOsseV7F__A2mUGDmzSILnKycI08532YwGw2qyv5RSCbowKIwra1PnklWe4FCtyxVUiGv74tqytvqTlUi2t73qxQ-znbPcn9xD3zteiDeaE8hUagnyfVEH5fupnx232fO74kCTZZNZgQ2TF7iUjd5s9xSht_x186UpLe76JmmjJ1eOUOUoztKacFFPZ7koBaniAxOwtaERYRjiNGM',
    type: 'GRÁTIS'
  },
  {
    id: 2,
    title: 'Código Fantasma',
    genre: 'CYBERPUNK',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAonD2rPSuYNUZwhxM9SM9Ioly9ag900WcLejz79F0sCaC1prneITkQTyHP7EKLpfVp78xSyCxmlItFPr-c23xHIGmS4L3hwZ5SoLWSQMOljxWWU86EFRR5JIcZGNt8fByIdCQq-yvlIQkNs0ScE-pm3V2jsghefAg9o_sd2M3XH2qaE2DJswbVEpywifgtTLR4T1L81eb_Zdm3nDqob2DRt1j1kZPdJGxsCNgy51c4BeKD_Xxhr9_UNtWcwhJlAtkoc4ebqx4Encc',
    type: 'PREMIUM'
  },
  {
    id: 3,
    title: 'O Guardião da Mata',
    genre: 'FANTASIA',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDndp7OhnZaKHUGH7lDFXL_kyhZa_x_SAArlbzbvRTFAjqG_RHypD6P5jE5w6bjR15myAksMvm3AC8hQbnnTTwGEsDx859C1PNaOyWpLCoJzzqvWMGwTdpggxHvIn489kJrNZft0I5qcLLEiBKMl3GtUPoU36Ng9CpCowr-pyKtwATf1E6HbPSo2I_96j5et2O4tzDwy5m4VTj8TJeQLhMb9vnOZDmKMe8lR7a-moPGZ14Brlb8u1p9AkBetrk9YjerCBu4cUs55Cg',
    type: 'GRÁTIS'
  },
  {
    id: 4,
    title: 'Chuva de Vidro',
    genre: 'NOIR',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB7FmVe5b3KxtuzwiYHo0PO8WXsZrLU8gVT_dOofWNHF7TrQZ6tkIIVsELCG5ZuW0jG9Q2P5OpcUow0PEBjSDjPACD_X1FQ2bRJiYE367mPuhMvVj7-z5c1mFr2zu543U8HtNIrb0JTJZQCl119gOzzvTK6KGHh1XC45IG4jIgnNc9LnuDlITnHcW2ZbCSU5hZDFztTzsqnByXYDOcESkCblZ0ywpRTAaIiHj9EiFoSU-yVLoOPwmOn1aLDDEhjF7fqrxTy5Eq-km8',
    type: 'PREMIUM'
  }
];

const TRENDING = [
  { id: 1, title: 'Ecos do Amanhã', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC9PGnAWaykDQFRJ2g6tcewxSmHBKN7hYSB9D9ganOuCaCNVDFmt_qKUma0NGVfBSe00g3oqTHYo1qa5HT0EeAJkIszALQx0D-UmRG22WBY3_cEPRkWsHHCRT5ClHdyhr9gB6yAI4J5yOzfBBlPapvpTgv-vb0r71r1qEaskJkt6SaWcPWMO4mlTk1H08K-_wt_yEM1xe4z3LRBQEUtMH-B_cI1qNN96gW6kQwup4vJptpB_gdwoIIPDDs2Ogww8-lEB_vU-6tPga0' },
  { id: 2, title: 'O Último Baile', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDa3JeIPFIrfWmdS7D7JFJcLLdTekrZPvpr7mOs55DzzdUPXrDCDjoebqUxDHoO8336kYk5vEcFNzz78M3gQSgYKILtuaYTIsOwnWVJjKm-gRd1t9qEkVZKYKejBnCPTrSvHA3omETlxWXgycwfbb2bf6Fo5ibiti4iZviLmV8nx6gpvo2IsZ7A71wPZZZvqqLOGMeyJnj2lrHMBUVXRPKQwLQCyuoKdyVzP-X5Wc4OI7hmwAbYUQyx6uJBI1x3PgwCOXJMK6qxbs4' },
  { id: 3, title: 'Trono de Cinzas', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAw54Z4wtDV0J6ABv56X_fMHrilECyh9rdHzVkwZkvxO9FWMzj-BOAK8M9eRveXrvD9fQNT2ruEPe0pnEOZaJhBTGUxH2soKvo6i7_pnbTVUo9kshQ0hTkWZP0t79qprLzLCzl7UpWUWCgWZvxwB8KbWvJqThOeoMx6Xs3k3ukwIPtx7NJLMggPJO4PjZYWCcg9cVMIkj5EmtxRDDpxERfd7fEOdUrkRTWHOgkeEqe0p3VIQyAmePvWtRfSbmJo_vRWrEA3rxq4_T0' },
  { id: 4, title: 'Mente Sintética', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCDVYAOSy9nl1vMdxzCyA-vt_VpYHBBWCFcH6IzIKytM6S4qUzmlLz0teMhJSgLwp82PSbe0lI-CZRLZnyA_H2k39c5aaaJtLfAmRuj0cz5wQ6qNos4TAtvtTaPs0OVE4-ChLrbDrY_UeBlmw0HsMIxFLNVNfToFSinoY07dTF99N2v-EtUsScO8S-Vvsx8sQtaGQlfL5RNSwvPIbqIXnaSGNaTwfTWFjvZv03QpyllpHp1ZGKvOE1O9-uKF5rl0cjuoWEpl4l-JIE' }
];

const PREMIUM_STORIES = [
  {
    id: 1,
    title: 'Relíquias Sagradas',
    description: 'Descubra os segredos escondidos por milênios.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuANJNS57E1tQvEOfwrYVh0PjzwsOjx2ubELq_hOnSa6cKhooEz9kRbbm0lkK-4FV7enuRnw0gRF5VNfcbOP3KyuSB8XtbJ2qSA1PHCbkqgaxSZ9LRv2PH5myb-jqCPWonWkOtB02_g56WQshJufrjDrFVGZ2XeUSF0WDI7MFwQuiFLEu3t2oS8bCEzcSa1kNh50TIpiClNWsRGKs5DCNymKehSw-KkZPsqeT9fn2QJQ3THzLWQ1sfkzM_yeBWMWTXQBGl6R491JaD0'
  },
  {
    id: 2,
    title: 'O Farol de Dados',
    description: 'No mar da informação, apenas a verdade brilha.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCsNaD24Tf1OpTkU7kKlvLliEvoyybvIvFluLYZM9LsQMD3JCifwsVK-FdwtJ2GN8DvMh7-AL17TK4DqD-9yeqkWM6TvI4DieUOavu1_JIayOyxwyifMhXOsgURDCocxGyUlNq9bMJEKaI_ZCFlw7P8GCqEXqtpWIpWLs8GhOn9-HyaafzWNjRjvf_2fKkgW2EJ5oizyC1H1S_DnOKqI9qhoa_U6sN8fu2BTTQhgaVvIdUK0ppLi8PutWSndlnbmD_q0vQbCUJ9a8Y'
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('library');

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 h-16 glass">
        <div className="flex items-center gap-2">
          <BookCheck className="w-6 h-6 text-primary" />
          <h1 className="font-serif italic text-xl font-bold text-primary tracking-tight">
            Enredo.ai
          </h1>
        </div>
        <button className="text-zinc-500 hover:text-primary transition-colors p-2">
          <Search className="w-6 h-6" />
        </button>
      </header>

      <main className="pt-20 px-5 space-y-10">
        {/* Originals Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-2xl font-semibold">Enredo.ai Originals</h2>
            <button className="text-xs font-bold tracking-widest text-primary hover:opacity-80 transition-opacity">
              VER TUDO
            </button>
          </div>
          <div className="flex overflow-x-auto gap-6 hide-scrollbar -mx-5 px-5 snap-x">
            {ORIGINALS.map((item) => (
              <motion.div
                key={item.id}
                whileHover={{ scale: 1.02 }}
                className="snap-start min-w-[300px] md:min-w-[420px] aspect-[16/10] relative rounded-xl overflow-hidden glass group cursor-pointer"
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="absolute inset-0 w-full h-full object-cover grayscale-25 group-hover:grayscale-0 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                <div className="absolute top-4 right-4 bg-primary text-on-primary text-[10px] font-bold px-2 py-1 rounded-sm shadow-xl">
                  {item.tag}
                </div>
                <div className="absolute bottom-5 left-5 right-5">
                  <p className="text-[10px] font-bold tracking-widest text-violet-300 mb-1">
                    {item.genre}
                  </p>
                  <h3 className="font-serif italic text-xl text-white">
                    {item.title}
                  </h3>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Community Section */}
        <section>
          <h2 className="font-serif text-2xl font-semibold mb-4">Comunidade</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {COMMUNITY.map((item) => (
              <motion.div
                key={item.id}
                whileHover={{ y: -4 }}
                className="glass rounded-xl overflow-hidden group cursor-pointer"
              >
                <div className="aspect-[3/4] relative">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                  />
                  <div className="absolute top-3 left-3">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded shadow-lg backdrop-blur-md ${
                      item.type === 'PREMIUM' ? 'bg-tertiary text-on-tertiary' : 'bg-black/40 text-white'
                    }`}>
                      {item.type}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-[10px] font-bold text-zinc-500 tracking-widest mb-1">
                    {item.genre}
                  </p>
                  <h4 className="font-serif text-base text-zinc-100 leading-tight">
                    {item.title}
                  </h4>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Trending Section */}
        <section>
          <h2 className="font-serif text-2xl font-semibold mb-4">Tendências</h2>
          <div className="flex overflow-x-auto gap-4 hide-scrollbar -mx-5 px-5 snap-x">
            {TRENDING.map((item) => (
              <motion.div
                key={item.id}
                whileTap={{ scale: 0.95 }}
                className="snap-start min-w-[140px] group cursor-pointer"
              >
                <div className="aspect-[2/3] rounded-xl overflow-hidden glass mb-2 relative">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <h4 className="font-serif text-sm text-zinc-200 truncate pr-2">
                  {item.title}
                </h4>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Premium Section */}
        <section>
          <h2 className="font-serif text-2xl font-semibold mb-4">Premium</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PREMIUM_STORIES.map((item) => (
              <motion.div
                key={item.id}
                whileHover={{ scale: 1.01 }}
                className="glass flex h-36 rounded-2xl overflow-hidden group cursor-pointer"
              >
                <div className="w-1/3 h-full">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="w-2/3 p-5 flex flex-col justify-center">
                  <span className="text-tertiary text-[10px] font-bold tracking-widest mb-1 italic">
                    PREMIUM STORY
                  </span>
                  <h3 className="font-serif text-lg text-white mb-1">
                    {item.title}
                  </h3>
                  <p className="text-zinc-500 text-xs line-clamp-2">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 h-24 glass">
        {[
          { id: 'library', icon: Library, label: 'Biblioteca' },
          { id: 'reading', icon: BookOpen, label: 'Lendo' },
          { id: 'scenes', icon: Film, label: 'Cenas' },
          { id: 'create', icon: PlusCircle, label: 'Criar' },
          { id: 'profile', icon: User, label: 'Perfil' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 transition-all ${
                isActive ? 'text-primary scale-110' : 'text-zinc-500'
              }`}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`} />
              <span className="font-serif text-[10px] font-medium">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
