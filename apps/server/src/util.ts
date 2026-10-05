import { randomBytes, randomInt } from 'node:crypto';
import type { CharacterId } from '@saloon/protocol';

export const CHARACTERS: CharacterId[] = ['coyote', 'lynx', 'badger', 'rabbit'];
/** Cryptographically strong float in [0,1) for shuffles and timing targets. */
export const cryptoRandom = () => (randomInt(0, 2 ** 26) * 2 ** 26 + randomInt(0, 2 ** 26)) / 2 ** 52;
export const newId = (prefix: string) => `${prefix}-${randomBytes(6).toString('hex')}`;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const newCode = () => Array.from({ length: 5 }, () => CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)]).join('');
export const validCode = (c: unknown): c is string => typeof c === 'string' && /^[A-Z0-9]{4,8}$/.test(c);
export const cleanName = (n: unknown, fallback = 'Kẻ lạ mặt') => {
  const s = typeof n === 'string' ? n.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 24) : '';
  return s || fallback;
};
export const cleanCharacter = (c: unknown): CharacterId | undefined => (CHARACTERS as unknown[]).includes(c) ? (c as CharacterId) : undefined;

export class TokenBucket {
  private tokens: number; private last = Date.now();
  constructor(private capacity: number, private perSec: number) { this.tokens = capacity; }
  take(now = Date.now()) {
    this.tokens = Math.min(this.capacity, this.tokens + ((now - this.last) / 1000) * this.perSec); this.last = now;
    if (this.tokens < 1) return false;
    this.tokens -= 1; return true;
  }
}
export const log = (msg: string) => console.log(`[saloon ${new Date().toISOString()}] ${msg}`);
