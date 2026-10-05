export const PROTOCOL_VERSION = 3;
export type Suit = 'S' | 'H' | 'D' | 'C';
/** Card modifiers (max 1 per card). Buffs: gold, wild, lucky. Debuffs: trapRank, trapSuit, cursed. See MAGIC_CATALOG.md. */
export type CardModifier = 'gold' | 'wild' | 'lucky' | 'trapRank' | 'trapSuit' | 'cursed';
export const CARD_MODIFIERS: readonly CardModifier[] = ['gold', 'wild', 'lucky', 'trapRank', 'trapSuit', 'cursed'];
export const isDebuff = (m: CardModifier) => m === 'trapRank' || m === 'trapSuit' || m === 'cursed';
/** A physical card entity of the current hand. `id` is unique within the match (spare/inserted cards get ids like "s12"); rank/suit may repeat. */
export interface Card { id: string; rank: number; suit: Suit; modifiers?: CardModifier[] }
export type CharacterId = 'coyote' | 'lynx' | 'badger' | 'rabbit';
export type Phase = 'lobby' | 'market' | 'playing' | 'showdown' | 'finished';
export type Street = 'preflop' | 'flop' | 'turn' | 'river';
/** Public data only. Never contains wallet, magic cards, offers or hole-card modifiers. */
export interface PublicPlayer {
  id: string; name: string; seat: number; character: CharacterId;
  connected: boolean; ready: boolean; bot: boolean; folded: boolean;
  eliminated: boolean; allIn: boolean; bet: number; contribution: number;
  /** Number of hole cards held (0 or 2). */
  handSize: number;
  /** Hole cards forced public this hand (K02). Includes their modifiers. Usually []. */
  revealedCards: Card[];
}
export interface Pot { amount: number; eligibleIds: string[] }
export interface LogEntry { id: string; at: number; text: string; kind: 'info' | 'bet' | 'win' | 'magic'; magicId?: string }
/** Card-derived showdown bonuses (public: derivable from the revealed cards). Money passives are NOT here (private). */
export interface Bonus { playerId: string; kind: 'gold' | 'lucky' | 'cursed'; amount: number }
export interface HandResult { winners: {playerId: string; amount: number; handName?: string}[]; revealed: {playerId: string; cards: Card[]}[]; bonuses: Bonus[]; summary: string }
export interface GameSetup {startingWallet:number;smallBlind:number;bigBlind:number;turnSeconds:number;marketSeconds:number;blindEveryHands:number;blindGrowth:number}
export interface RoomSnapshot {
  setup?:GameSetup;
  roomId: string; code: string; phase: Phase; handId: number; street: Street;
  players: PublicPlayer[]; board: Card[]; pots: Pot[]; pot: number;
  turnPlayerId: string | null; hostId: string | null; dealerSeat: number; smallBlind: number; bigBlind: number;
  /** In phase 'market' this is the market end time (same for everyone). */
  deadline: number; serverTime: number; log: LogEntry[];
  result: HandResult | null; winnerId: string | null;
  nextBlindInHands: number | null; nextBlinds: { smallBlind: number; bigBlind: number } | null;
}
/** active: used once then gone. passive_continuous: effective while held. passive_triggered: waits for `trigger`, runs, may be consumed. */
export type MagicKind = 'active' | 'passive_continuous' | 'passive_triggered';
/** public: everyone sees card+sound+log. hinted: only the affected player gets a vague hint. hidden: nobody is told. Silent (N07) turns hinted into hidden, never touches public. */
export type Visibility = 'public' | 'hinted' | 'hidden';
export type TriggerName = 'deal' | 'win_pot' | 'lose_showdown' | 'bankrupt' | 'looked_at' | 'magic_looked_at' | 'trap_applied';
/** PRIVATE offer: 4 magic offers plus 2–3 ordinary reserve offers per hand (also before hand 1). */
export interface MarketOffer {
  id: string; slot: number; magicId: string; name: string; kind: MagicKind; visibility: Visibility; swap: boolean; trigger?: TriggerName;
  description: string; price: number;
  /** Exact ordinary card sold by this offer; purchase must preserve this entity. */
  card?: Card;
  /** Already bought this market. */
  purchased: boolean;
  /** Passive you already hold (cannot buy twice). */
  owned: boolean;
}
export interface MagicSlot {
  /** 0..4 */
  slot: number; magicId: string;
  /** Swap cards: the spare card you can put into your hand (id, rank, suit, modifiers all visible to you). */
  spare?: Card;
  /** Can it be used right now (phase/turn/targets)? */
  usable: boolean;
}
/** Result of a Lá soi phép (K10): one card the target holds. `magicId: null` = target holds none ('trống'). May be a decoy if the target has N09. Never includes a swap card's spare. */
export interface MagicPeek { magicId: string | null; kind?: MagicKind; visibility?: Visibility; targetPlayerId: string }
export interface PeekEntry {
  handId: number; label: string; card?: Card; magic?: MagicPeek; text?: string;
  /** Private provenance, never a guarantee that an opponent has not swapped since. */
  source?: 'K01' | 'K07'; targetPlayerId?: string;
  /** Board at the instant K07 was used; a changed board invalidates the prediction. */
  boardIds?: string[];
}
export interface LegalActions { canCheck: boolean; callAmount: number; minRaiseTo: number; maxRaiseTo: number; canRaise: boolean; canFold: boolean }
export interface PrivateSnapshot {
  playerId: string; wallet: number;
  /** Hole cards, WITH modifiers. */
  hand: Card[];
  /** Exactly MAGIC_SLOTS (5) entries or fewer: only occupied slots are listed. */
  magic: MagicSlot[];
  /** This player's own market (4 magic + 2–3 reserves in phase 'market', [] otherwise). */
  market: MarketOffer[];
  marketRefreshPrice?: number;
  marketHandsLeft?: number;
  /** Private info gained this hand (soi, gương thần, notices). Cleared at the start of each hand. */
  peeks: PeekEntry[];
  /** Private log: purchases, uses, bonuses, being peeked at. Last 40. */
  privateLog: LogEntry[];
  /** Money-passive and card bonuses paid to this player at the end of the last hand (private). */
  lastBonuses: { kind: string; amount: number }[];
  legal: LegalActions;
}
export const MAGIC_SLOTS = 5;
export type Command = {commandId: string; handId?: number} & (
  | {type:'ready'; ready:boolean}
  | {type:'character'; character:CharacterId}
  | {type:'start'}
  | {type:'nextHand'}
  | {type:'refreshMarket'}
  | {type:'configureGame';setup:GameSetup}
  | {type:'bet'; action:'check'|'call'|'raise'|'fold'|'allIn'; amount?:number}
  /** Phase 'market' only. If all 5 slots are full, `replaceSlot` is required and that card is destroyed (no refund). */
  | {type:'buyMagic'; offerId:string; replaceSlot?:number}
  /** Phase 'market' only. Destroys the card in `slot` (no refund). */
  | {type:'discardMagic'; slot:number}
  /** Active non-swap cards: own turn, except K07 (anyTime while playing) . Needs handId. */
  | {type:'useMagic'; slot:number; targetPlayerId?:string; handIndex?:0|1; boardIndex?:number; modifier?:'gold'|'wild'}
  /** Reserve exchange (R01, X01..X03). Own turn: exchange hand and reserve, preserving both cards. */
  | {type:'swap'; slot:number; handIndex:0|1}
  | {type:'addBot'}
  /** Host only, phase 'finished' only: resets wallets/board/eliminations and returns everyone to the lobby for a fresh match with the same seats. */
  | {type:'rematch'}
  /** Host only, phase 'finished' only: ends the table for everyone (all clients are disconnected and the room closes). */
  | {type:'disband'}
  /** Host only, outside 'lobby'/'finished': aborts the match early (whoever has the most chips is declared the winner). */
  | {type:'endMatch'}
  /** Host only, phase 'lobby' or 'finished' only: removes a seat (human or bot) and frees it up. */
  | {type:'kick'; targetPlayerId:string}
);
export interface CommandResult {ok:boolean; error?:string}
/**
 * `to` set => PRIVATE event: the server delivers it only to that player. No `to` => broadcast to the room.
 * - 'shuffle' (public): a fresh 52-card deck was built and shuffled for hand `handId` (carries nothing else).
 * - 'magicUsed' (PUBLIC visibility only): `{playerId: actor, magicId, targetPlayerId?, cue: sound category}`. For Decoy (K09) `magicId` is a FAKE card.
 * - 'magicHint' (private, `to` = affected player, HINTED visibility only): `cue` = hint kind ('looked' | 'hexed' | 'sensed'), `text` vague. No actor, no card id.
 * - HIDDEN uses (and hinted uses by a Silent holder) produce NO event to anyone but the actor's own 'use'.
 * - 'purchase' / 'use' (private, `to` = actor): the actor's own feedback. 'notice'/'sound': generic.
 */
export interface GameEvent {id:string; at:number; type:'shuffle'|'magicUsed'|'magicHint'|'sound'|'notice'|'purchase'|'use'; handId?:number; playerId?:string; targetPlayerId?:string; magicId?:string; cue?:string; text?:string; to?:string}
export interface PlayerInput {id:string; name:string; character?:CharacterId; bot?:boolean}
/** blindEveryHands: blinds grow every N hands (0 = never); blindGrowth: multiplier per level. Defaults from content DEFAULTS. */
export interface GameOptions {roomId:string; code:string; now?:number; random?:()=>number; blindEveryHands?:number; blindGrowth?:number}
export interface GameEngine {
  addPlayer(player:PlayerInput, now:number):void;
  setConnected(playerId:string, connected:boolean):void;
  removePlayer(playerId:string):void;
  applyCommand(playerId:string, command:Command, now:number):CommandResult;
  tick(now:number):void;
  publicSnapshot(now:number):RoomSnapshot;
  privateSnapshot(playerId:string, now:number):PrivateSnapshot;
  takeEvents():GameEvent[];
  serialize():unknown;
}
export interface MagicDefinition {
  id:string; name:string; kind:MagicKind; /** Active card that carries a spare card (X01-X03). */ swap?:boolean; trigger?:TriggerName; visibility:Visibility; /** passive_triggered: true = consumed after one run, number = after N runs, false = never. Active cards are always consumed. */ consumed:boolean|number; description:string;
  /** Base price at blind level 0 (BB 20); see priceFor in content. */
  price:number; weight:number;
  /** When an active card can be used. */
  timing?: 'turn' | 'market' | 'anyTime';
  /** Sound category for the audio layer when this card is used (see MAGIC_CATALOG.md). */
  sound: string;
}
export const suitSymbol = (s:Suit) => ({S:'♠',H:'♥',D:'♦',C:'♣'})[s];
export const rankLabel = (r:number) => ({11:'J',12:'Q',13:'K',14:'A'} as Record<number,string>)[r] ?? String(r);
export const modifierLabel = (m:CardModifier) => ({gold:'Vàng',wild:'Muôn chất',lucky:'Hạnh vận',trapRank:'Bẫy số',trapSuit:'Bẫy chất',cursed:'Nguyền'})[m];

/** Ephemeral room communication; never contains private game state. */
export interface ChatMessage {id:string;playerId:string;name:string;text:string;at:number}
export interface SocialState {messages:ChatMessage[];microphones:Record<string,boolean>;voiceSessions?:Record<string,string>}
export interface VoiceSignal {toPlayerId:string;fromPlayerId?:string;fromSession?:string;toSession?:string;description?:{type:'offer'|'answer';sdp:string};candidate?:{candidate:string;sdpMid?:string|null;sdpMLineIndex?:number|null;usernameFragment?:string|null}}
