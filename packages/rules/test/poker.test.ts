import { describe,it,expect } from 'vitest';
import { createDeck,evaluateHand,evaluateHoldem,compareHands,buildPotBands } from '../src/index';
const cards=(...ids:string[])=>ids.map(id=>createDeck().find(c=>c.id===id)!);
describe('Texas Hold’em evaluator',()=>{
  it('ranks a wheel below a six-high straight',()=>{
    const wheel=evaluateHand(cards('AS','2D','3H','4C','5S','KC','QD'));
    expect(wheel.category).toBe(4);expect(wheel.tiebreak).toEqual([5]);
    expect(compareHands(evaluateHand(cards('2S','3D','4H','5C','6S')),wheel)).toBeGreaterThan(0);
  });
  it('compares every category and its kickers',()=>{
    const hands=[
      cards('AS','JD','9H','7C','4S'),cards('AS','AD','9H','7C','4S'),cards('AS','AD','9H','9C','4S'),
      cards('AS','AD','AH','9C','4S'),cards('AS','2D','3H','4C','5S'),cards('AS','JS','9S','7S','4S'),
      cards('AS','AD','AH','9C','9S'),cards('AS','AD','AH','AC','9S'),cards('AS','KS','QS','JS','10S'),
    ].map(evaluateHand);
    hands.forEach((h,i)=>expect(h.category).toBe(i));
    hands.slice(1).forEach((h,i)=>expect(compareHands(h,hands[i])).toBeGreaterThan(0));
    expect(compareHands(evaluateHand(cards('AS','AD','KH','JC','9S')),evaluateHand(cards('AH','AC','KD','JS','8H')))).toBeGreaterThan(0);
  });
  it('can use zero, one, or two hole cards, and ties ignore suits',()=>{
    const board=cards('AS','KS','QS','JS','10S');
    expect(evaluateHoldem(cards('2D','3D'),board).cards.map(c=>c.id).sort()).toEqual(board.map(c=>c.id).sort());
    expect(compareHands(evaluateHoldem(cards('2D','3D'),board),evaluateHoldem(cards('AH','AD'),board))).toBe(0);
    const one=evaluateHoldem(cards('AS','3C'),cards('AH','AD','AC','7D','2H'));
    expect(one.category).toBe(7);expect(one.cards.filter(c=>['AS','3C'].includes(c.id))).toHaveLength(1);
    const two=evaluateHoldem(cards('AS','AD'),cards('AH','AC','KD','7D','2H'));
    expect(two.category).toBe(7);expect(two.cards.filter(c=>['AS','AD'].includes(c.id))).toHaveLength(2);
  });
  it('rejects duplicate cards',()=>expect(()=>evaluateHand(cards('AS','AS','KS','QS','JS'))).toThrow());
  it('builds side pots with folded dead money',()=>{
    expect(buildPotBands([{id:'a',contribution:100,folded:false},{id:'b',contribution:200,folded:false},{id:'c',contribution:300,folded:true}]).map(p=>({amount:p.amount,eligibleIds:p.eligibleIds}))).toEqual([{amount:300,eligibleIds:['a','b']},{amount:200,eligibleIds:['b']},{amount:100,eligibleIds:[]}]);
  });
  it('orders straight flushes (wheel lowest), two pair kickers, and full houses from two trips',()=>{
    const wheelFlush=evaluateHand(cards('AS','2S','3S','4S','5S'));expect(wheelFlush.category).toBe(8);expect(wheelFlush.tiebreak).toEqual([5]);
    expect(compareHands(evaluateHand(cards('2H','3H','4H','5H','6H')),wheelFlush)).toBeGreaterThan(0);
    expect(compareHands(evaluateHand(cards('KS','KD','4H','4C','9S')),evaluateHand(cards('KH','KC','4D','4S','8S')))).toBeGreaterThan(0);
    const boat=evaluateHand(cards('KS','KD','KH','9C','9S','9D','2C'));expect(boat.category).toBe(6);expect(boat.tiebreak).toEqual([13,9]);
  });
  it('picks the best seven-card hand and ties when the board plays regardless of hole cards',()=>{
    expect(evaluateHoldem(cards('AS','KS'),cards('QS','JS','2S','2D','3C')).category).toBe(5);
    expect(evaluateHoldem(cards('9S','8H'),cards('7D','6C','5S','AD','AC')).category).toBe(4);
    const board=cards('9S','9D','7H','4C','2D');
    expect(compareHands(evaluateHoldem(cards('AC','3C'),board),evaluateHoldem(cards('AD','3D'),board))).toBe(0);
    expect(compareHands(evaluateHoldem(cards('KC','3C'),board),evaluateHoldem(cards('AD','3D'),board))).toBeLessThan(0);
    expect(evaluateHoldem([],cards('AS','KD','QH','JC','9S')).category).toBe(0);
  });
  it('builds exact side-pot bands for all-in levels with identical contributions',()=>{
    const bands=buildPotBands([{id:'a',contribution:50,folded:false},{id:'b',contribution:50,folded:false},{id:'c',contribution:120,folded:false},{id:'d',contribution:0,folded:true}]);
    expect(bands.map(b=>[b.from,b.to,b.amount,b.eligibleIds])).toEqual([[0,50,150,['a','b','c']],[50,120,70,['c']]]);
  });
});
