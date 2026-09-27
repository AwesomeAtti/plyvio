import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import GameInfo from '../src/lib/components/game/GameInfo.svelte';

const base = { white: 'A', black: 'B', result: '1-0', date: '2026.09.01', site: 'Chess.com', chips: [], hasRow: false };
const meta = (container) => container.querySelector('.meta').textContent.replace(/\s+/g, ' ').trim();

describe('§5.6.5 Game Info — time control on row 3', () => {
  it('draws the time control and its speed class after the site', () => {
    const { container } = render(GameInfo, { info: { ...base, timeControl: '3+0', timeClass: 'blitz' } });
    expect(meta(container)).toMatch(/Chess\.com\s*3\+0 · Blitz$/);
  });

  it('draws the time control alone when the class is not recorded', () => {
    const { container } = render(GameInfo, { info: { ...base, timeControl: '10+5', timeClass: null } });
    expect(meta(container)).toMatch(/10\+5$/);
  });

  it('draws nothing — not an absence — for a game without one', () => {
    const { container } = render(GameInfo, { info: { ...base, timeControl: null, timeClass: 'blitz' } });
    expect(container.querySelectorAll('.meta .mi')).toHaveLength(2);
    expect(meta(container)).not.toMatch(/Blitz/);
  });
});
