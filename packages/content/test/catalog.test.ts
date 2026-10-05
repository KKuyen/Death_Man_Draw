import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { MAGIC, getMagic, priceFor } from '../src/index';

describe('magic catalog', () => {
  it('has unique ids, prices and sound categories', () => {
    expect(new Set(MAGIC.map(m => m.id)).size).toBe(MAGIC.length);
    expect(MAGIC.length).toBeGreaterThanOrEqual(14); expect(MAGIC.length).toBeLessThanOrEqual(30);
    MAGIC.forEach(m => { expect(m.price).toBeGreaterThan(0); expect(m.sound).toBeTruthy(); expect(m.description.length).toBeLessThan(120); });
    
  });
  it('visibility model', () => {
    expect(MAGIC.filter(m => m.visibility === 'public').map(m => m.id).sort()).toEqual(['K02', 'K03', 'K09', 'K11', 'K12', 'K13', 'N02', 'N04']);
    expect(MAGIC.filter(m => m.visibility === 'hinted').map(m => m.id).sort()).toEqual(['K01', 'K08', 'K10']);
    expect(getMagic('K07')).toMatchObject({ name: 'Quả cầu soi', visibility: 'hidden', timing: 'anyTime' });
    expect(MAGIC.filter(m => m.swap).every(m => m.visibility === 'hidden')).toBe(true);
    MAGIC.filter(m => m.kind === 'passive_triggered').forEach(m => expect(m.trigger).toBeTruthy());
    MAGIC.filter(m => m.kind === 'active').forEach(m => expect(m.consumed).toBe(!m.swap));
    expect(getMagic('K06')).toBeUndefined();
    expect(getMagic('N07')?.kind).toBe('passive_continuous');
  });
  it('prices grow with blind level', () => { expect(priceFor(100, 0)).toBe(100); expect(priceFor(100, 2)).toBe(120); });
  it('MAGIC_CATALOG.md lists every card id and name', () => {
    const md = readFileSync(new URL('../../../MAGIC_CATALOG.md', import.meta.url), 'utf8');
    for (const m of MAGIC) { expect(md).toContain(`| ${m.id} |`); expect(md).toContain(m.name); }
  });
});
