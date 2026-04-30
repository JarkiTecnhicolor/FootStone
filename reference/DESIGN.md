# Football Card Roguelike — Design Document

**Робоча назва**: TBD (варіанти: "Manager's Hand", "Transfer Window", "Coach's Deck")
**Жанр**: Single-player roguelike deckbuilder, футбольна тематика
**Натхнення**: Slay the Spire (run-структура), Meteorfall: Journeys (свіп-механіка), NUTMEG! (футбольна тема), Balatro (короткі run'и)
**Платформи**: PC (Steam), потім mobile (iOS/Android)
**MVP**: один опонент, один матч, повний цикл механік

---

## 1. Vision Statement

Гра, де ти — менеджер футбольного клубу, і кожен сезон — це короткий roguelike-run. Збираєш команду через "трансферну кампанію" (deckbuilding), граєш серію матчів проти опонентів-архетипів, кожен матч — короткий 5-ходовий поєдинок із картковою механікою.

**Унікальний хук**: трансфери як deckbuilding природно лягають на тему. Ти не просто "береш сильнішу карту" — ти **підписуєш гравця** під свій тактичний план. Кожна карта-гравець має ім'я, перку, лор. Колекційна цінність + стратегічна.

**Цільова аудиторія**: фанати roguelike-deckbuilder'ів (StS, Balatro) які цікавляться футболом, або фанати футбольних менеджерів які хочуть швидший досвід ніж Football Manager.

**Тривалість**:
- Один матч: 5-7 хвилин
- Один run (сезон): 1-2 години
- Повна гра: десятки годин через різноманіття опонентів, унікальні карти, мета-прогрес

---

## 2. Базовий цикл (Game Loop)

### 2.1. Macro loop — один run (сезон)

1. **Початок сезону**: гравець обирає клуб (стартова дека) і воротаря
2. **Матчі чемпіонату**: 8-12 матчів проти різних опонентів-архетипів
3. **Між матчами — Transfer events**:
   - Купівля нових карт-гравців (за призові)
   - Апгрейд існуючих
   - Видалення слабких
   - Випадкові події (травми, скандали, бонуси)
4. **Кубок / плей-офф**: 2-3 фінальних матчі підвищеної складності
5. **Кінець run**: перемога або поразка → меta-прогрес → новий run

### 2.2. Micro loop — один матч

1. **Setup phase**: гравцю показується опонент, його унікальні карти-загрози, дека-архетип
2. **Стартова рука**: 5 рандомних карт з твоєї деки
3. **5 ходів**:
   - Phase 1: твій хід (виставляєш карти, атакуєш форвардами що готові)
   - Phase 2: хід опонента (AI грає за тими ж правилами)
4. **Кінець матчу**: рахунок голів вирішує переможця

---

## 3. Базові механіки матчу

### 3.1. Поле

Поле розділене на зони (зверху вниз):

```
[Воротар опонента (save N)]
[Захист опонента] (захисники з HP)
[Півзахист опонента] (півзахисники зі стаміною)
[Атакувальна зона опонента] (форварди в стані attacking_next або ready)
═════════════════════════════
[Атакувальна зона гравця]
[Півзахист гравця]
[Захист гравця]
[Воротар гравця (save N)]
```

Дзеркальне розташування: атакувальні зони обох команд сусідять у центрі.

### 3.2. Ресурси гравця

- **Дії на хід** — основний ресурс. Прогресія: 2 → 3 → 4 → 5 → 6 (по ходах матчу)
- **Рука** — ліміт 8 карт. Якщо тягнеш карту коли рука повна, вона йде у відбій.
- **Дека / Відбій** — стандартна циклічна механіка. Коли дека пуста, відбій тасується назад.
- **Дроу** — 1 базова карта на хід (хід 2-5). Перки півзахисників можуть давати +1.

### 3.3. Структура ходу гравця

1. **Початок ходу**: оновлюється `actions` до значення прогресії, дроу карт згідно `BASE_DRAW + Σ midDrawBonus`
2. **Форварди** в стані `attacking_next` переходять у стан `ready_to_attack`
3. **Гравець виконує дії** (в довільному порядку, поки `actions > 0`):
   - Виставляти карти з руки (платить cost карти)
   - Атакувати готовими форвардами (без cost — атака безкоштовна, бо cost вже сплачено при виставленні)
   - Скасовувати дії через undo
4. **Завершення ходу**:
   - Не атаковані `ready_to_attack` форварди йдуть у відбій (пропускають)
   - Перехід до ходу опонента

### 3.4. Структура ходу опонента (AI)

1. AI тягне карти згідно своєї логіки дрову
2. AI грає карти з руки в порядку пріоритету: (за умовчанням) snipper → forward → midfielder → defender
3. Коли всі AI-форварди в стані `ready_to_attack` — вони атакують автоматично за пріоритетом цілі (перший захисник, або воротар якщо нема захисту)
4. Розпад стаміни в обох сторін (стаміна -1 у всіх півзахисників на полі)

### 3.5. Стани форвардів (двохходовий цикл)

- `attacking_next`: щойно виставлений, чекає до наступного ходу свого власника
- `ready_to_attack`: на твоєму наступному ході — готовий атакувати (іконка ⚡)
- Атакував → у відбій

Опонент має **вікно** (свій хід між цими станами) щоб знести твого форварда snipper-картою (як Кривцов з деки Шахтаря).

---

## 4. Ролі карт

### 4.1. Захисник (DEF, синій)

- **Стан**: HP / max_HP
- **Поведінка**: виставляється на поле, поглинає damage від атак опонента
- **Цикл життя**: лишається до пробиття HP→0 або до кінця матчу
- **Атакується першим**: завжди front-line

### 4.2. Півзахисник (MID, жовтий)

- **Стан**: stamina / max_stamina
- **Поведінка**: виставляється на поле, дає бафи / draw / синергії
- **Цикл життя**: щоход stamina -1, на 0 → у відбій (повертається в деку при reshuffle)
- **Не атакується безпосередньо**: знесення тільки через snipper-карти (Arvalo Rios)

### 4.3. Форвард (FWD, червоний)

- **Стан**: atk + status (attacking_next / ready_to_attack)
- **Поведінка**: виставляється → чекає 1 хід → атакує наприкінці наступного ходу
- **Цикл життя**: одноразовий, після атаки у відбій
- **Targeting**: гравець обирає ціль (захисник / воротар якщо немає захисту)

### 4.4. Воротар (Goalkeeper)

- **Не картка деки**: обирається перед матчем, статичний
- **Save value**: damage потрібний щоб пробити (наприклад, save 3 = damage > 3 щоб забити)
- **Поглинає damage**: тільки залишок який пройшов крізь захист
- **Не вмирає в матчі**: тільки save value (як абстрактний "клас воротаря")

**Майбутні воротарі** з різними стилями (на run-рівні):
- **Захисний воротар** (save 4, але дороже коштує)
- **Контратакувальний** (save 2, але +1 atk форвардам коли захист повний)
- **Універсальний** (save 3, без бонусів)

---

## 5. Атака — детальна механіка

### 5.1. Розрахунок atk форварда

```
final_atk = base_atk
         + sum(buffs from own midfielders)
         + own card perk modifiers (e.g. hidden gem +3 if mid present)
         + opponent-context modifiers (e.g. Mudruk +2 проти HP1 захисників)
```

### 5.2. Damage flow

```
damage = final_atk
damage -= opponent midfielder damage_reducers (e.g. Kantee -1)

IF (forward.bypass) {
  // прохід наскрізь, ігноруємо захист
  IF damage > opponent.keeper.save → ГОЛ
  ELSE save
}
ELSE IF (target = defender) {
  IF damage >= defender.hp:
    defender removed
    leftover_damage = damage - defender.hp
    IF leftover_damage > 0:
      IF leftover_damage > keeper.save → ГОЛ
      ELSE save
  ELSE:
    defender.hp -= damage
}
ELSE IF (target = keeper, нема захисту):
  IF damage > keeper.save → ГОЛ
  ELSE save
```

### 5.3. Targeting flow для гравця (двоклік)

1. Клік на форварда в стані `ready_to_attack` → активується targeting mode
2. Підсвічуються можливі цілі (червоною рамкою)
3. Інші карти затемнені (opacity 0.4)
4. Клік на ціль → атака виконана
5. Cancel: повторний клік на форварда, кнопка "Скасувати", або undo

---

## 6. Перки — системи синергій

### 6.1. Типи перків (із прототипу)

**Buff perks** (півзахисники):
- "+2 атаки усім твоїм форвардам" (Modruk) — глобальний баф
- "+1 атаки форвардам" (Bellinghame, Maycon) — слабший варіант
- "-1 damage опонента щоход" (Kantee) — defensive baff

**Draw perks** (півзахисники):
- "+1 draw поки на полі" (Pedrri, Patrick) — engine cards

**Synergy perks** (на роль карти):
- "+1 HP при виставленні поруч з півзах." (Rudidiger) — defensive synergy
- "+3 атаки якщо є півзах. на полі (hidden gem)" (Vinicus) — cheap карта-комбо
- "+1 атаки якщо є півзах. на полі" (Dentinho) — слабший варіант

**Conditional perks** (контекстні):
- "+2 атаки проти HP1 захисників" (Mudruk, Шахтар) — карає за дешевих захисників
- "+2 атаки форвардам Шахтаря" (Stepanenko) — фракційний баф (тільки для своїх)

**Special action perks** (snipper-карти):
- "Знеси будь-яку карту опонента" (Arvalo Rios) — універсальний знос
- "Знеси виставленого форварда опонента" (Кривцов, Шахтар) — точкова відповідь

**Ability perks** (special ability):
- "Прохід наскрізь — атакує тільки воротаря" (Mossi) — bypass захист

### 6.2. Принципи дизайну перків

- **Не лінійна вартість**: дешеві карти можуть мати потужні перки за умови. Принцип "hidden gem" робить deckbuilding цікавим.
- **Синергії важливі**: окремо Vinicus слабкий, з півзахисником — найкраща карта в грі. Це створює рішення в трансферах.
- **Counter-play**: на сильні стратегії опонент має відповідь. Якщо ти спамиш форвардами, опонент має Кривцова. Якщо опонент тримає Stepanenko як двигун, твій Arvalo Rios — кін.
- **Фракційні перки** для опонентів: робить унікальні карти впізнаваними ("я граю проти Шахтаря — буде Stepanenko з його +2 для своїх").

---

## 7. Базова дека гравця (стартова, 13 карт)

| ID | Ім'я | Роль | Cost | Stats | Перка |
|---|---|---|---|---|---|
| p_d1 | Van Dijra | DEF | 3 | HP 4 | — (вантажна стіна) |
| p_d2 | Saliboo | DEF | 2 | HP 2 | — |
| p_d3 | Rudidiger | DEF | 3 | HP 3 | +1 HP при виставленні поруч з півзах. |
| p_d4 | Acerbe | DEF | 1 | HP 1 | дешевий filler (вразливий до Mudruk) |
| p_m1 | Modruk | MID | 4 | stm 3 | +2 атаки усім твоїм форвардам |
| p_m2 | Kantee | MID | 2 | stm 2 | -1 damage опонента щоход |
| p_m3 | Pedrri | MID | 3 | stm 3 | плеймейкер: +1 draw щоход |
| p_m4 | Bellinghame | MID | 3 | stm 2 | +1 атаки форвардам |
| p_m5 | Arvalo Rios | MID | 5 | stm 1 | СНАЙПЕР: знеси будь-яку карту опонента |
| p_f1 | Mbarre | FWD | 4 | atk 5 | — (топ-форвард) |
| p_f2 | Holande | FWD | 3 | atk 4 | — |
| p_f3 | Vinicus | FWD | 1 | atk 2 | +3 атаки якщо є півзах. на полі (hidden gem) |
| p_f4 | Mossi | FWD | 5 | atk 3 | ПРОХІД НАСКРІЗЬ — атакує тільки воротаря |

Розподіл: 4 захисники / 5 півзахисники / 4 форварди.

---

## 8. Опоненти-архетипи

### 8.1. Шахтар (атакувальний) — MVP опонент

**Архетип**: 11 карт з ухилом у форварди (5 атакерів). Слабкий захист, але прес.

| ID | Ім'я | Роль | Cost | Stats | Перка |
|---|---|---|---|---|---|
| o_d1 | Krychowiak | DEF | 2 | HP 2 | — |
| o_d2 | Bondar | DEF | 1 | HP 1 | — |
| o_d3 | Marlos | DEF | 3 | HP 3 | — |
| o_d4 | Кривцов | DEF | 4 | HP 2 | СНАЙПЕР: знеси виставленого форварда опонента |
| o_m1 | Stepanenko | MID | 3 | stm 3 | УНІКАЛЬНА: +2 атаки форвардам Шахтаря |
| o_m2 | Maycon | MID | 2 | stm 2 | +1 атаки форвардам |
| o_m3 | Patrick | MID | 3 | stm 3 | плеймейкер (+1 draw) |
| o_f1 | Mudruk | FWD | 2 | atk 3 | +2 атаки проти HP1 захисників |
| o_f2 | Junior Moraes | FWD | 3 | atk 4 | — |
| o_f3 | Ferreyra | FWD | 4 | atk 5 | — |
| o_f4 | Solomon | FWD | 1 | atk 2 | +1 атаки |
| o_f5 | Dentinho | FWD | 3 | atk 3 | +1 атаки якщо є півзах. на полі |

**Воротар Шахтаря**: save 2 (слабший за дефолт)

### 8.2. Майбутні опоненти (concept)

**Динамо (балансована)**: рівномірний розподіл, без яскравих архетипів. Воротар save 3.
**Реал (контролеви/draw-engine)**: багато півзахисників, draw-bonus переваги. Воротар save 3.
**Барселона (passing)**: всі карти дешеві, ліміт ходу 8 (не 6). Тематично tiki-taka.
**Atletico (oborona)**: 5 захисників з високим HP, лише 2-3 форварди. Воротар save 4.
**Liverpool (gegenpressing)**: всі форварди мають "+1 атаки якщо опонент має mid на полі" — карає за півзахист.
**PSG (зіркова)**: 3 топ-карти з cost 5+ (типу Mbarre), решта filler. Високий ризик на rules.

Кожен опонент має 1-2 **унікальні** карти що визначають стиль.

---

## 9. Run-структура (постMVP)

### 9.1. Сезон як run

```
[Стартовий бюджет] → [Купівля стартової деки]
       ↓
[Матч 1] → [Винагорода: гроші + вибір карти]
       ↓
[Матч 2] → [Transfer event: купівля/апгрейд/ризик]
       ↓
... (8-12 матчів регулярного сезону)
       ↓
[Зимове вікно — великий transfer event]
       ↓
... (ще 4-6 матчів)
       ↓
[Плей-офф 1/4] → [Плей-офф 1/2] → [Фінал]
       ↓
[Перемога / поразка] → meta-progress
```

### 9.2. Transfer events (між матчами)

- **Стандартний**: вибір з 3 нових карт за призові
- **Аукціон**: одна топ-карта по підвищеній ціні
- **Скаут**: рандомний пакет 5 карт з можливістю взяти 1
- **Ринок 50/50**: дешева карта-сюрприз, не видно що, але дешево
- **Ризикова угода**: топ-карта зі штрафом (наприклад, "Mbarre, але -1 atk решті твоїх форвардів")
- **Травма / скандал**: випадкова карта твоєї деки тимчасово недоступна на 1 матч

### 9.3. Винагороди за матчі

- **Перемога**: повна сума призових + вибір карти
- **Нічия**: половина суми + малий вибір
- **Поразка**: -10% репутації + втрата ще одного матчу = вильот

### 9.4. Кінець run

- **Чемпіон**: пройшов чемпіонат + кубок → велика перемога
- **Виліт**: 3 поразки в чемпіонаті = run закінчений
- **Меta-progress**: золото → unlock нових клубів, нових карт, нових опонентів

---

## 10. Технічна архітектура

### 10.1. Стек

- **Vite + React 18 + TypeScript** — основа
- **Zustand** — state management (один store на match, один на run)
- **Tailwind CSS** — styling
- **Vitest** — unit-тести логіки
- **Framer Motion** (опційно) — анімації карт

Майбутнє:
- **Tauri** — wrap у desktop app для Steam
- **Capacitor** — iOS/Android з тих самих джерел

### 10.2. Структура папок

```
src/
  game/                    // ВСЯ ЛОГІКА — без UI, чисті функції
    types.ts              // Card, GameState, MatchState, RunState
    cards/
      player-deck.ts      // PLAYER_DECK
      opponents/
        shakhtar.ts
        dynamo.ts
    rules/
      combat.ts           // resolveAttack, calculateAtk, applyDamage
      cost.ts             // canAfford, payCost
      stamina.ts          // decayMids, isReady
      draw.ts             // drawCard, calculateDrawForTurn
      perks.ts            // applyPerk dispatchers
    ai/
      simple.ts           // AI скрипт як в прототипі
      evaluator.ts        // (постMVP) оцінка стану для smarter AI
    match.ts              // оркестрація одного матчу
    run.ts                // оркестрація сезону (постMVP)
  ui/
    components/
      Card.tsx            // одна карта з усіма стилями
      Field.tsx           // поле з зонами
      Hand.tsx            // рука гравця
      TargetingOverlay.tsx
    screens/
      MatchScreen.tsx
      SetupScreen.tsx
      RunMapScreen.tsx    // (постMVP)
      TransferScreen.tsx  // (постMVP)
  store/
    matchStore.ts         // Zustand store, dispatcher actions
    runStore.ts
  data/
    constants.ts          // ACTION_PROGRESSION, HAND_LIMIT, etc.
  __tests__/
    combat.test.ts
    perks.test.ts
    ai.test.ts
```

### 10.3. Принцип "Pure logic, dumb UI"

Уся ігрова логіка — **чисті функції**. UI лише дзеркалить state.

```typescript
// game/rules/combat.ts
export function resolveAttack(
  attacker: ForwardCard,
  defenders: DefenderCard[],
  keeperSave: number,
  context: AttackContext
): AttackResult {
  // повертає новий стан без mutation, без side effects
}

// store/matchStore.ts
const matchStore = create<MatchState & MatchActions>((set) => ({
  ...initialState,
  attack: (forwardId, targetId) => {
    const result = resolveAttack(...);
    set((s) => ({ ...applyResult(s, result) }));
  }
}));

// ui/components/Card.tsx — лише дзеркалить
const Card = ({ card }: { card: CardData }) => {
  const onClick = useMatchStore((s) => s.attack);
  return <div onClick={() => onClick(card.id)}>...</div>;
};
```

Переваги:
- Тести легкі (без mocking React)
- AI може запускати симуляції без UI
- Заміна UI шару (наприклад, Unity port) не вимагає переписувати правила

### 10.4. Type definitions (стартові)

```typescript
// game/types.ts
export type Role = 'def' | 'mid' | 'fwd';

export interface BaseCard {
  id: string;
  name: string;
  role: Role;
  cost: number;
  perk: string;
  drawBonus?: number;
  unique?: boolean;
}

export interface DefenderCard extends BaseCard {
  role: 'def';
  hp: number;
  maxHp: number;
  sniperFwd?: boolean;  // знос форварда при виставленні
}

export interface MidfielderCard extends BaseCard {
  role: 'mid';
  stamina: number;
  maxStamina: number;
  sniper?: boolean;     // знос будь-якої карти при виставленні
}

export interface ForwardCard extends BaseCard {
  role: 'fwd';
  atk: number;
  status?: 'attacking_next' | 'ready_to_attack';
  bypass?: boolean;     // прохід наскрізь
}

export type Card = DefenderCard | MidfielderCard | ForwardCard;

export interface MatchState {
  turn: number;
  maxTurn: number;
  actions: number;
  maxActions: number;
  myKeeper: number;
  oppKeeper: number;
  myScore: number;
  oppScore: number;
  myDefenders: DefenderCard[];
  myMids: MidfielderCard[];
  myFwds: ForwardCard[];
  oppDefenders: DefenderCard[];
  oppMids: MidfielderCard[];
  oppFwds: ForwardCard[];
  hand: Card[];
  deck: Card[];
  discard: Card[];
  oppHand: Card[];
  oppDeck: Card[];
  oppDiscard: Card[];
  log: string[];
  gameOver: boolean;
  phase: 'player' | 'opponent' | 'resolving';
  firstTurn: boolean;
}
```

### 10.5. Константи

```typescript
// data/constants.ts
export const ACTION_PROGRESSION = [2, 3, 4, 5, 6];
export const HAND_LIMIT = 8;
export const BASE_DRAW = 1;
export const INITIAL_HAND = 5;
export const MAX_TURN = 5;
```

---

## 11. Тестова стратегія

### 11.1. Unit-тести (Vitest)

**Combat**:
```typescript
test('Mbarre на 5 проти Van Dijra HP 4 пробиває і йде у воротаря', () => {
  const result = resolveAttack(mbarre, [vanDijra], 3, defaultContext);
  expect(result.defenderRemoved).toBe(true);
  expect(result.leftoverDamage).toBe(1);
  expect(result.goal).toBe(false); // 1 < save 3
});

test('Vinicus з Modruk = atk 7, пробиває Bondar і забиває', () => {
  const result = resolveAttack(vinicus, [bondar], 2, { mids: [modruk, pedrri] });
  expect(result.finalAtk).toBe(7); // 2 + 2(Modruk) + 3(hidden gem)
  expect(result.goal).toBe(true);
});

test('Kantee нейтралізує -1 damage', () => {
  const result = resolveAttack(mbarre, [], 2, { ownMids: [kantee] });
  expect(result.finalDamage).toBe(4); // 5 - 1
});
```

**Perks dispatch**:
```typescript
test('Rudidiger без півзах не отримує бонус', () => {
  expect(applyPlacePerk(rudidiger, { mids: [] }).hp).toBe(3);
});

test('Rudidiger з півзах отримує +1 HP', () => {
  expect(applyPlacePerk(rudidiger, { mids: [pedrri] }).hp).toBe(4);
});
```

**AI behavior**:
```typescript
test('Шахтар пріоритезує Кривцова коли є виставлений форвард', () => {
  const state = makeState({ oppHand: [krychowiak, junior, krycov], myFwds: [mbarre] });
  const move = simpleAI(state);
  expect(move.cardId).toBe('o_d4'); // Кривцов
});
```

### 11.2. Integration-тести (повні матчі)

```typescript
test('повний матч 5 ходів проти Шахтаря завершується', () => {
  let state = makeFreshMatch(playerDeck, shakhtarDeck);
  while (!state.gameOver) {
    state = playerSimpleAI(state);
    state = endTurn(state);
  }
  expect(state.turn).toBe(6); // після 5 ходів
});
```

### 11.3. Balance simulation

Симулятор для балансингу — запускає 1000 матчів з обома AI і повертає win-rate.

```typescript
const stats = runSimulation(playerDeck, shakhtarDeck, 1000);
// { playerWins: 543, oppWins: 423, draws: 34 }
// → ~54% win-rate, балансовано
```

---

## 12. Roadmap (по етапах)

### Phase 1: Foundation (1-2 тижні)

- [ ] Setup Vite + React + TypeScript
- [ ] Перенести логіку з `prototype.html` у `src/game/`
- [ ] Написати tests для combat (мінімум 20 тестів)
- [ ] Базовий UI: один матч проти Шахтаря з повним функціоналом прототипу
- [ ] Балансинг цифр через симуляції

### Phase 2: Run structure (2-3 тижні)

- [ ] Меню: новий run, обрання клубу
- [ ] Run map: послідовність матчів
- [ ] 3 опоненти-архетипи (Шахтар, Динамо, Реал)
- [ ] Базові transfer events (вибір 3 карт)
- [ ] Збереження прогресу між матчами
- [ ] Endrun екран (перемога/поразка)

### Phase 3: Content & Polish (3-4 тижні)

- [ ] 6+ опонентів з унікальними архетипами
- [ ] 30+ нових карт-гравців
- [ ] Воротарі з різними стилями
- [ ] Більше transfer events (skout, аукціон, ризикова угода)
- [ ] Анімації карт (Framer Motion)
- [ ] Sound effects, music

### Phase 4: Meta-progression (2 тижні)

- [ ] Unlocks: нові клуби, карти, опоненти
- [ ] Achievements
- [ ] Daily challenge
- [ ] Statistics screen

### Phase 5: Mobile & Steam (3-4 тижні)

- [ ] Tauri build для Steam
- [ ] Capacitor для iOS/Android
- [ ] Touch controls
- [ ] Screen size adaptations

**Загалом до повноцінного MVP: 3-4 місяці парт-тайм роботи.**

---

## 13. Питання для подальшого продумування

Ці речі **навмисно** не вирішені — вони потребують playtest'у або більше думок:

1. **Чи дати гравцю обрати воротаря для всього run, чи для кожного матчу окремо?**
2. **Чи всі трансфери коштують гроші, чи деякі — "вільні агенти" по випадку?**
3. **Як збалансувати "виліт після 3 поразок" — занадто жорстко?**
4. **Чи має гра permadeath (StS-style) чи softer "save state"?**
5. **PvP в майбутньому?** Якщо так — треба інша AI-архітектура.
6. **Лор**: чи робити серйозний (як FIFA), іронічний (як Football Manager Easter eggs), чи фантастичний (умовні "магічні" карти)?

---

## 14. Інспірація і референси

**Геймплей**:
- *Slay the Spire* — структура run, intent system, balance
- *Meteorfall: Journeys* — спрощений swipe combat, інтерфейс
- *NUTMEG!* — футбольна тема + deckbuilding, deck-color-by-role
- *Balatro* — короткі run'и, hidden gems через перки, ante-структура

**Конкуренти**:
- *Olé Card Game* — soccer roguelike (PvP-фокус, інша ніша)
- *NUTMEG!* — football management deckbuilder (більш менеджерський)
- *Picoball* — football deckbuilder (індi, простіший)

**Уникати**:
- Ліцензійних проблем: всі імена гравців **слідують з шаблону "змінене прізвище"**, але **не настільки впізнаване**, щоб бути юридичною бомбою. Альтернатива на майбутнє — повністю вигадані імена з лором.
- Симетричних PvP-матчів — це жанрово інша гра.
- Складного AI з планувальником — у roguelike опонент-як-бос природніший.

---

## 15. Початковий prompt для Claude Code

Коли почнеш проект локально, дай Claude Code такий prompt разом з цим файлом і `prototype.html`:

> Я хочу почати React-проект для футбольного roguelike-deckbuilder. Прочитай DESIGN.md (повний дизайн-док) і prototype.html (робоча імплементація однієї матч-механіки). Запропонуй:
> 1. Структуру проекту згідно DESIGN.md розділу 10.2
> 2. Перші 5 файлів які варто створити (типи, константи, базові правила)
> 3. План перенесення логіки з prototype.html у чистий TypeScript
>
> Не починай переписувати код, спершу покажи план. Я погоджу і ми будемо ітерувати по одному файлу.

---

*Документ створений як snapshot сесії дизайну. Фінальні цифри будуть змінюватись після playtest'ів.*
