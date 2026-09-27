import { describe, expect, it } from 'vitest';
import { formatTimeControl } from '../src/lib/pgn/timeControl.js';

describe('formatTimeControl — minutes+increment, the form players read', () => {
  it('sudden death and increment, in whole minutes', () => {
    expect(formatTimeControl('180')).toBe('3+0');
    expect(formatTimeControl('60+1')).toBe('1+1');
    expect(formatTimeControl('600+5')).toBe('10+5');
    expect(formatTimeControl('7200+30')).toBe('120+30');
  });

  it('a base under a minute reads as a fraction where one exists', () => {
    expect(formatTimeControl('30')).toBe('½+0');
    expect(formatTimeControl('15+2')).toBe('¼+2');
    expect(formatTimeControl('90+1')).toBe('1½+1');
    expect(formatTimeControl('20+1')).toBe('20s+1');
  });

  it('daily games read as days per move', () => {
    expect(formatTimeControl('1/86400')).toBe('1d');
    expect(formatTimeControl('1/259200')).toBe('3d');
  });

  it('an absent or placeholder value is null — never drawn verbatim', () => {
    for (const v of [null, undefined, '', '  ', '?', '-']) expect(formatTimeControl(v)).toBeNull();
  });

  it('any other form of the standard is kept verbatim rather than guessed at', () => {
    expect(formatTimeControl('40/7200:3600')).toBe('40/7200:3600');
    expect(formatTimeControl('*60')).toBe('*60');
    expect(formatTimeControl('1/3600')).toBe('1/3600');
  });
});
