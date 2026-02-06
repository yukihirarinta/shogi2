import { createInitialState } from '../shogi/initialState';
import { tryApplyMove } from '../shogi/legal';
import { createPositionKey } from '../shogi/repetition';
import { loadGameState, saveGameState } from '../shogi/storage';
import type { GameState } from '../shogi/types';

function emptyState(turn: 'black' | 'white' = 'black'): GameState {
  const state = createInitialState();
  state.board = state.board.map(() => null);
  state.hands.black = { FU: 0, KY: 0, KE: 0, GI: 0, KI: 0, KA: 0, HI: 0 };
  state.hands.white = { FU: 0, KY: 0, KE: 0, GI: 0, KI: 0, KA: 0, HI: 0 };
  state.turn = turn;
  state.result = { status: 'playing' };
  state.positionCounts = {};
  return state;
}

describe('loop4 endgame and storage', () => {
  it('marks repetition when the same position count reaches 4', () => {
    const state = emptyState('black');
    state.board[8 * 9 + 4] = { side: 'black', type: 'OU', promoted: false };
    state.board[0 * 9 + 4] = { side: 'white', type: 'OU', promoted: false };
    state.board[6 * 9 + 4] = { side: 'black', type: 'FU', promoted: false };

    const move = {
      kind: 'move' as const,
      from: { x: 4, y: 6 },
      to: { x: 4, y: 5 },
      promote: false,
    };

    const simulated = tryApplyMove(state, move);
    expect(simulated).not.toBeNull();

    const nextKey = createPositionKey(simulated!);
    state.positionCounts[nextKey] = 3;

    const next = tryApplyMove(state, move);
    expect(next?.result.status).toBe('repetition');
  });

  it('marks checkmate when side to move has no legal escape', () => {
    const state = emptyState('black');
    state.board[8 * 9 + 4] = { side: 'black', type: 'OU', promoted: false };
    state.board[0 * 9 + 4] = { side: 'white', type: 'OU', promoted: false };
    state.board[0 * 9 + 3] = { side: 'white', type: 'KY', promoted: false };
    state.board[0 * 9 + 5] = { side: 'white', type: 'KY', promoted: false };
    state.board[1 * 9 + 4] = { side: 'white', type: 'FU', promoted: false };
    state.board[2 * 9 + 4] = { side: 'black', type: 'HI', promoted: false };
    state.board[2 * 9 + 3] = { side: 'black', type: 'KI', promoted: false };
    state.board[2 * 9 + 5] = { side: 'black', type: 'KI', promoted: false };

    const next = tryApplyMove(state, {
      kind: 'move',
      from: { x: 4, y: 2 },
      to: { x: 4, y: 1 },
      promote: false,
    });

    expect(next).not.toBeNull();
    expect(next?.result).toEqual({ status: 'checkmate', winner: 'black' });
  });

  it('saves and restores valid state', () => {
    const key = 'shogi2:test:valid';
    const state = createInitialState();

    saveGameState(state, key);
    const loaded = loadGameState(key);

    expect(loaded).not.toBeNull();
    expect(loaded?.turn).toBe('black');
  });

  it('rejects malformed storage payload and clears it', () => {
    const key = 'shogi2:test:invalid';
    localStorage.setItem(key, JSON.stringify({ bad: true }));

    const loaded = loadGameState(key);

    expect(loaded).toBeNull();
    expect(localStorage.getItem(key)).toBeNull();
  });
});
