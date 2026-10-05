import { DEFAULTS } from '@saloon/content';
import { restoreGame } from '@saloon/rules';
import type { RoomCheckpoint } from './persistence.js';
import { validCode } from './util.js';

const isInt = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;

/** Returns null when the checkpoint is safe to restore, else a reason (never includes card data). */
export function validateCheckpoint(cp: unknown): string | null {
  if (!cp || typeof cp !== 'object') return 'not an object';
  const c = cp as RoomCheckpoint;
  if (typeof c.roomId !== 'string' || !validCode(c.code)) return 'bad id/code';
  if (!Array.isArray(c.humans) || c.humans.length > 4 || c.humans.some(h => !h || typeof h.id !== 'string' || typeof h.name !== 'string' || !/^[0-9a-f]{64}$/.test(String(h.keyHash)))) return 'bad humans';
  const e = c.engine as any;
  if (!e || typeof e !== 'object' || !Array.isArray(e.players) || e.players.length > 4) return 'bad engine state';
  const ids = new Set<string>();
  let chips = 0;
  for (const p of e.players) {
    if (!p || typeof p.id !== 'string' || ids.has(p.id)) return 'bad player';
    ids.add(p.id);
    if (!isInt(p.wallet) || !isInt(p.contribution) || !isInt(p.bet)) return 'bad chip value';
    chips += p.wallet + p.contribution;
  }
  if (c.humans.some(h => !ids.has(h.id))) return 'human not seated';
  const l = e.ledger ?? {};
  for (const k of ['burned', 'minted']) if (!isInt(l[k])) return 'bad ledger';
  // Chips can only enter via starting wallets and minted bonuses.
  const ceiling = (e.setup?.startingWallet??DEFAULTS.startingWallet) * e.players.length + l.minted;
  if (chips > ceiling) return `chip total ${chips} exceeds ceiling ${ceiling}`;
  try { restoreGame(c.engine, { roomId: c.roomId, code: c.code, random: () => 0.5 }); } catch (err) { return `engine rejected state: ${(err as Error).message}`; }
  return null;
}
