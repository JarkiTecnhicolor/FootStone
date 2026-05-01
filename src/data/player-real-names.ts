export function displayName(id: string, fallback: string): string {
  return REAL_PLAYERS[id] ?? fallback
}

const PARTICLES = new Set(['van', 'von', 'de', 'del', 'da', 'do', 'dos', 'der', 'di', 'la', 'le', 'al', 'bin'])

export function surname(id: string, fallback: string): string {
  const full = displayName(id, fallback)
  const tokens = full.split(/\s+/).filter(Boolean)
  if (tokens.length <= 1) return full
  const last = tokens[tokens.length - 1]
  const prev = tokens[tokens.length - 2]
  if (PARTICLES.has(prev.toLowerCase())) return `${prev} ${last}`
  return last
}

export const REAL_PLAYERS: Record<string, string> = {
  'k_onana': 'André Onana',
  'k_nojer': 'Manuel Neuer',
  'k_weiden': 'Roman Weidenfeller',
  'k_buffon': 'Gianluigi Buffon',
  'k_riznyk': 'Dmytro Riznyk',
  'k_lunin': 'Andriy Lunin',
  'k_shovkov': 'Oleksandr Shovkovskyi',
  'k_pyatov': 'Andriy Pyatov',

  'p_d1': 'Virgil van Dijk',
  'p_d2': 'William Saliba',
  'p_d3': 'Antonio Rüdiger',
  'p_d4': 'Francesco Acerbi',
  'p_d5': 'Harry Maguire',
  'p_d6': 'Robert Huth',
  'p_d7': 'Fabio Cannavaro',
  'p_d8': 'Sergio Ramos',
  'p_d9': 'Gerard Piqué',
  'p_d10': 'Taras Mykhavko',
  'p_d11': 'Oleh Luzhny',
  'p_d12': 'Valeriy Bondar',
  'p_d13': 'Yukhym Konoplya',
  'p_d14': 'Oleksandr Holovko',
  'p_d15': 'Oleksandr Karavayev',
  'p_d16': 'Raphaël Varane',
  'p_d17': 'Ibrahima Konaté',
  'p_d18': 'Alessandro Nesta',
  'p_d19': 'Jan Vertonghen',
  'p_d20': 'Thomas Vermaelen',
  'p_d21': 'Grzegorz Krychowiak',
  'p_m1': 'Luka Modrić',
  'p_m2': "N'Golo Kanté",
  'p_m3': 'Pedri',
  'p_m4': 'Jude Bellingham',
  'p_m5': 'Casemiro',
  'p_m6': 'Mykola Shaparenko',
  'p_m7': 'Beñat Etxebarria',
  'p_m8': 'Andrea Pirlo',
  'p_m9': 'Paul Pogba',
  'p_m10': 'Vitaliy Buyalskyi',
  'p_m11': 'Mesut Özil',
  'p_m12': 'Heorhiy Sudakov',
  'p_m13': 'Serhiy Sydorchuk',
  'p_m14': 'Thomas Gravesen',
  'p_m15': 'Xavi',
  'p_m16': 'Andriy Husin',
  'p_m17': 'Enzo Fernández',
  'p_m18': 'Juan Román Riquelme',
  'p_m19': 'Andrés Iniesta',
  'p_f1': 'Kylian Mbappé',
  'p_f2': 'Erling Haaland',
  'p_f3': 'Vinícius Júnior',
  'p_f4': 'Lionel Messi',
  'p_f5': 'Vladyslav Vanat',
  'p_f6': 'Eden Hazard',
  'p_f7': 'Patrik Schick',
  'p_f8': 'Cristiano Ronaldo',
  'p_f9': 'Lorenzo Insigne',
  'p_f10': 'Bojan Krkić',
  'p_f11': 'Artem Besedin',
  'p_f12': 'Romelu Lukaku',
  'p_f13': 'Matvii Ponomarenko',
  'p_f14': 'Thierry Henry',
  'p_f15': 'Oleksandr Zubkov',
  'p_f16': 'Viktor Tsygankov',
  'p_f17': 'Yevhen Konoplyanka',
  'p_f18': 'Roman Yaremchuk',
  'p_f19': 'Robert Lewandowski',
  'p_f20': 'Andriy Yarmolenko',
  'p_f21': 'Gianluca Scamacca',
  'p_f22': 'Romário',
  'p_f23': 'Wayne Rooney',

  'o_d2': 'Valeriy Bondar',
  'o_d3': 'Marlos',
  'o_d4': 'Yaroslav Rakytskyi',
  'o_m1': 'Taras Stepanenko',
  'o_m2': 'Maycon Roque',
  'o_m3': 'Bernard (footballer)',
  'o_f1': 'Mykhailo Mudryk',
  'o_f2': 'Júnior Moraes',
  'o_f3': 'Facundo Ferreyra',
  'o_f4': 'Manor Solomon',
  'o_f5': 'Dentinho',
}
