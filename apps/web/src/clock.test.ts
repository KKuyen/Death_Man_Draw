import {it,expect} from 'vitest';
import {remainingSeconds} from './clock';
import {countdownVolume} from './audio';
it('both market and turn timers advance without any new snapshots, resync skew, clamp expired deadlines',()=>{expect(remainingSeconds(125000,100000,900000,900000)).toBe(25);expect(remainingSeconds(125000,100000,900000,904000)).toBe(21);expect(remainingSeconds(125000,104000,904000,909000)).toBe(16);expect(remainingSeconds(125000,104000,904000,999000)).toBe(0);expect(remainingSeconds(0,100000,0,10)).toBe(0);});
it('tick stays quiet early and increases monotonically through final ten seconds',()=>{expect(countdownVolume(25)).toBe(countdownVolume(11));for(let s=10;s>1;s--)expect(countdownVolume(s-1)).toBeGreaterThan(countdownVolume(s));expect(countdownVolume(1)).toBeGreaterThan(countdownVolume(20)*5);});
