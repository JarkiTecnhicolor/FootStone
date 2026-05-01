// Per-card real-life nationality (footballer-based reference).
// Used for chemistry bonuses + flag display.

export const NATIONALITY_BY_ID: Record<string, string> = {
  // Defenders
  p_d1: 'NL', // Van Dijra → Virgil van Dijk
  p_d2: 'FR', // Saliboo → William Saliba
  p_d3: 'DE', // Rudidiger → Antonio Rüdiger
  p_d4: 'IT', // Acerbe → Francesco Acerbi
  p_d5: 'EN', // Purifier → Harry Maguire
  p_d6: 'DE', // Huh → Robert Huth
  p_d7: 'IT', // Connotaro → Fabio Cannavaro
  p_d8: 'ES', // Ramoris → Sergio Ramos
  p_d9: 'ES', // Paquet → Gerard Piqué
  p_d10: 'UA', // Mechanic → Taras Mykhavko
  p_d11: 'UA', // Lugastiontiy → Oleh Luzhny
  p_d12: 'UA', // Bondaaru → Valeriy Bondar
  p_d13: 'UA', // Krepkyi → Yukhym Konoplya
  p_d14: 'UA', // Goalovko → Oleksandr Holovko
  p_d15: 'UA', // Karavay → Oleksandr Karavayev
  p_d16: 'FR', // Voron → Raphaël Varane
  p_d17: 'FR', // Konoto → Ibrahima Konaté
  p_d18: 'IT', // Nosti → Alessandro Nesta
  p_d19: 'BE', // Verstontet → Jan Vertonghen
  p_d20: 'BE', // Vermalen → Thomas Vermaelen
  p_d21: 'PL', // Krochovyak → Grzegorz Krychowiak

  // Mids
  p_m1: 'HR', // Modruk → Luka Modrić
  p_m2: 'FR', // Kantee → N'Golo Kanté
  p_m3: 'ES', // Pedrri → Pedri
  p_m4: 'EN', // Bellinghame → Jude Bellingham
  p_m5: 'BR', // Kosomoto → Casemiro
  p_m6: 'UA', // Chapa-Chapa → Mykola Shaparenko
  p_m7: 'ES', // Etxebarria → Beñat Etxebarria
  p_m8: 'IT', // Porcelo → Andrea Pirlo
  p_m9: 'FR', // Pohba → Paul Pogba
  p_m10: 'UA', // Bunjaku → Vitaliy Buyalskyi
  p_m11: 'DE', // O'Real → Mesut Özil
  p_m12: 'UA', // Tyagaryov → Heorhiy Sudakov
  p_m13: 'UA', // Sonbinor → Serhiy Sydorchuk
  p_m14: 'DK', // Gardensen → Thomas Gravesen
  p_m15: 'ES', // Xomi → Xavi
  p_m16: 'UA', // Husein → Andriy Husin
  p_m17: 'AR', // Erzo → Enzo Fernández
  p_m18: 'AR', // Riquale → Juan Roman Riquelme
  p_m19: 'ES', // Miniesta → Andrés Iniesta

  // Forwards
  p_f1: 'FR', // Mbarre → Kylian Mbappé
  p_f2: 'NO', // Holande → Erling Haaland
  p_f3: 'BR', // Vinicus → Vinícius Júnior
  p_f4: 'AR', // Mossi → Lionel Messi
  p_f5: 'UA', // Vomit → Vladyslav Vanat
  p_f6: 'BE', // Harvard → Eden Hazard
  p_f7: 'CZ', // Shock → Patrik Schick
  p_f8: 'PT', // Cryspyano → Cristiano Ronaldo
  p_f9: 'IT', // Insight → Lorenzo Insigne
  p_f10: 'ES', // Bajan → Bojan Krkić
  p_f11: 'UA', // Sosadin → Artem Besedin
  p_f12: 'BE', // Lakaka → Romelu Lukaku
  p_f13: 'UA', // Panamera → Matvii Ponomarenko
  p_f14: 'FR', // Henky → Thierry Henry
  p_f15: 'UA', // Zubenko → Oleksandr Zubkov
  p_f16: 'UA', // Tsi-Tsi → Viktor Tsygankov
  p_f17: 'UA', // Konchaslka → Yevhen Konoplyanka
  p_f18: 'UA', // Yaremmo → Roman Yaremchuk
  p_f19: 'PL', // Lewandex → Robert Lewandowski
  p_f20: 'UA', // Yarmolo → Andriy Yarmolenko
  p_f21: 'IT', // Sacamaca → Gianluca Scamacca
  p_f22: 'BR', // Rumourio → Romário
  p_f23: 'EN', // Ronney → Wayne Rooney

  // Keepers
  k_onana: 'CM', // Onunana → André Onana
  k_nojer: 'DE', // Nomer → Manuel Neuer
  k_weiden: 'DE', // Waisburfeller → Roman Weidenfeller
  k_buffon: 'IT', // Baronior → Gianluigi Buffon
  k_lunin: 'UA', // Lunyn → Andriy Lunin
  k_shovkov: 'UA', // Shovkovsky → Oleksandr Shovkovskyi
  k_pyatov: 'UA', // Pyatyk → Andriy Pyatov

  // Shakhtar opponents
  o_d2: 'UA', // Bondarro → Valeriy Bondar
  o_d3: 'BR', // Marlossi → Marlos
  o_d4: 'UA', // Rapunskiy → Yaroslav Rakytskyi
  o_m1: 'UA', // Steppanenko → Taras Stepanenko
  o_m2: 'BR', // Maycoon → Maycon Roque
  o_m3: 'BR', // Patrico → Alan Patrick
  o_f1: 'UA', // Mudruk → Mykhailo Mudryk
  o_f2: 'BR', // Juniyor Moraz → Júnior Moraes
  o_f3: 'AR', // Ferrayra → Facundo Ferreyra
  o_f4: 'IL', // Saloman → Manor Solomon
  o_f5: 'BR', // Dentinjo → Dentinho
  k_riznyk: 'UA', // Rylnyk → Dmytro Riznyk
}

export const FLAGS: Record<string, string> = {
  AR: '🇦🇷',
  BE: '🇧🇪',
  BR: '🇧🇷',
  CM: '🇨🇲',
  CZ: '🇨🇿',
  DE: '🇩🇪',
  DK: '🇩🇰',
  EN: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  ES: '🇪🇸',
  FR: '🇫🇷',
  HR: '🇭🇷',
  IL: '🇮🇱',
  IT: '🇮🇹',
  NL: '🇳🇱',
  NO: '🇳🇴',
  PL: '🇵🇱',
  PT: '🇵🇹',
  UA: '🇺🇦',
}

export const NATIONALITY_LABELS: Record<string, string> = {
  AR: 'Аргентина',
  BE: 'Бельгія',
  BR: 'Бразилія',
  CM: 'Камерун',
  CZ: 'Чехія',
  DE: 'Німеччина',
  DK: 'Данія',
  EN: 'Англія',
  ES: 'Іспанія',
  FR: 'Франція',
  HR: 'Хорватія',
  IL: 'Ізраїль',
  IT: 'Італія',
  NL: 'Нідерланди',
  NO: 'Норвегія',
  PL: 'Польща',
  PT: 'Португалія',
  UA: 'Україна',
}

export function nationalityOf(cardId: string): string | undefined {
  return NATIONALITY_BY_ID[cardId]
}

export function flagOf(cardId: string): string {
  const code = NATIONALITY_BY_ID[cardId]
  return code ? (FLAGS[code] ?? '') : ''
}
