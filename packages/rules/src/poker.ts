import { rankLabel, type Card, type Pot, type Suit } from '@saloon/protocol';

/** Plain 52-card deck without modifiers. */
export const createDeck=():Card[] => (['S','H','D','C'] as Suit[]).flatMap(suit=>Array.from({length:13},(_,i)=>({id:`${rankLabel(i+2)}${suit}`,rank:i+2,suit})));

export interface EvaluatedHand { category:number; tiebreak:number[]; cards:Card[]; name:string }
const NAMES=['Bài cao','Một đôi','Hai đôi','Bộ ba','Sảnh','Thùng','Cù lũ','Tứ quý','Thùng phá sảnh'];
export const hasMod=(c:Card,m:string)=>!!c.modifiers?.includes(m as never);
export const compareHands=(a:EvaluatedHand,b:EvaluatedHand):number => {
  if(a.category!==b.category)return a.category-b.category;
  for(let i=0;i<Math.max(a.tiebreak.length,b.tiebreak.length);i++){
    const difference=(a.tiebreak[i]??0)-(b.tiebreak[i]??0);if(difference)return difference;
  }
  return 0;
};
/**
 * Exactly five cards. Modifiers: `wild` matches any suit for a flush; `trapSuit` cards can never be part of a flush;
 * `trapRank` cards can never be part of a straight. Pairs/trips/quads ignore traps. More than four cards of one rank
 * (possible with swap cards) still rank as four of a kind.
 */
export function evaluateFive(cards:Card[]):EvaluatedHand {
  if(cards.length!==5)throw new Error('Cần đúng năm lá.');
  const ranks=cards.map(c=>c.rank).sort((a,b)=>b-a);
  const counts=new Map<number,number>();for(const rank of ranks)counts.set(rank,(counts.get(rank)??0)+1);
  const groups=[...counts].sort((a,b)=>b[1]-a[1]||b[0]-a[0]);
  const unique=[...new Set(ranks)];
  const noTrapRank=!cards.some(c=>hasMod(c,'trapRank'));
  const straight=noTrapRank&&unique.length===5?(unique[0]-unique[4]===4?unique[0]:unique.join(',')==='14,5,4,3,2'?5:0):0;
  const solid=cards.filter(c=>!hasMod(c,'wild'));
  const flush=!cards.some(c=>hasMod(c,'trapSuit'))&&solid.every(c=>c.suit===solid[0].suit);
  let category=0,tiebreak=ranks;
  const top=groups[0][1],second=groups[1]?.[1]??0;
  if(flush&&straight){category=8;tiebreak=[straight];}
  else if(top>=4){category=7;tiebreak=[groups[0][0],groups[1]?.[0]??0];}
  else if(top===3&&second>=2){category=6;tiebreak=[groups[0][0],groups[1][0]];}
  else if(flush){category=5;}
  else if(straight){category=4;tiebreak=[straight];}
  else if(top===3){category=3;tiebreak=[groups[0][0],...groups.slice(1).map(g=>g[0]).sort((a,b)=>b-a)];}
  else if(top===2&&second===2){category=2;tiebreak=[Math.max(groups[0][0],groups[1][0]),Math.min(groups[0][0],groups[1][0]),groups[2][0]];}
  else if(top===2){category=1;tiebreak=[groups[0][0],...groups.slice(1).map(g=>g[0]).sort((a,b)=>b-a)];}
  return {category,tiebreak,cards:[...cards],name:NAMES[category]};
}
/** Best five from 5–7 available cards; zero, one or two hole cards may be used. */
export function evaluateHand(cards:Card[]):EvaluatedHand {
  if(cards.length<5||cards.length>7||new Set(cards.map(c=>c.id)).size!==cards.length)throw new Error('Bộ bài không hợp lệ.');
  let best:EvaluatedHand|undefined;
  for(let a=0;a<cards.length-4;a++)for(let b=a+1;b<cards.length-3;b++)for(let c=b+1;c<cards.length-2;c++)for(let d=c+1;d<cards.length-1;d++)for(let e=d+1;e<cards.length;e++){
    const hand=evaluateFive([cards[a],cards[b],cards[c],cards[d],cards[e]]);if(!best||compareHands(hand,best)>0)best=hand;
  }
  return best!;
}
export const evaluateHoldem=(hole:Card[],board:Card[])=>evaluateHand([...hole,...board]);
export interface Contributor {id:string;contribution:number;folded:boolean}
export interface PotBand extends Pot {from:number;to:number;contributorIds:string[]}
export function buildPotBands(players:Contributor[]):PotBand[] {
  const levels=[...new Set(players.map(p=>p.contribution).filter(c=>c>0))].sort((a,b)=>a-b);
  let from=0;return levels.map(to=>{
    const contributors=players.filter(p=>p.contribution>=to);
    const band={from,to,amount:(to-from)*contributors.length,contributorIds:contributors.map(p=>p.id),eligibleIds:contributors.filter(p=>!p.folded).map(p=>p.id)};
    from=to;return band;
  });
}
