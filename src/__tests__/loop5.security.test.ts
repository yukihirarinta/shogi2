import { createInitialState } from '../shogi/initialState';
import { tryApplyMove } from '../shogi/legal';
import { loadGameState } from '../shogi/storage';
import type { GameMove, GameState } from '../shogi/types';

function emptyState(turn: 'black' | 'white' = 'black'): GameState {
  const state = createInitialState();
  state.board = state.board.map(() => null);
  state.hands.black = { FU: 0, KY: 0, KE: 0, GI: 0, KI: 0, KA: 0, HI: 0 };
  state.hands.white = { FU: 0, KY: 0, KE: 0, GI: 0, KI: 0, KA: 0, HI: 0 };
  state.turn = turn;
  state.result = { status: 'playing' };
  state.positionCounts = {};
  state.board[8 * 9 + 4] = { side: 'black', type: 'OU', promoted: false };
  state.board[0 * 9 + 4] = { side: 'white', type: 'OU', promoted: false };
  return state;
}

describe('loop5 security checks', () => {
  it('rejects out-of-range coordinates', () => {
    const state = createInitialState();
    const invalidMove = {
      kind: 'move',
      from: { x: 4, y: 6 },
      to: { x: 9, y: 6 },
      promote: false,
    } as GameMove;

    const next = tryApplyMove(state, invalidMove);
    expect(next).toBeNull();
  });

  it('rejects invalid drop piece type payload', () => {
    const state = emptyState('black');
    const invalidMove = {
      kind: 'drop',
      pieceType: 'SCRIPT',
      to: { x: 4, y: 4 },
    } as unknown as GameMove;

    const next = tryApplyMove(state, invalidMove);
    expect(next).toBeNull();
  });

  it('rejects malformed piece type in persisted data', () => {
    const key = 'shogi2:test:malicious-piece';
    const badState = createInitialState() as unknown as Record<string, unknown>;
    const board = Array.from({ length: 81 }, () => null) as Array<unknown>;
    board[0] = { side: 'black', type: 'FU', promoted: false };
    board[80] = { side: 'white', type: 'OU', promoted: false };
    board[40] = { side: 'black', type: '<script>', promoted: false };

    badState.board = board;
    localStorage.setItem(key, JSON.stringify(badState));

    const loaded = loadGameState(key);
    expect(loaded).toBeNull();
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('rejects malformed history entries in persisted data', () => {
    const key = 'shogi2:test:malicious-history';
    const badState = createInitialState() as unknown as Record<string, unknown>;
    badState.history = [{ side: 'hacker', move: { kind: 'drop', pieceType: 'FU', to: { x: 0, y: 0 } } }];

    localStorage.setItem(key, JSON.stringify(badState));

    const loaded = loadGameState(key);
    expect(loaded).toBeNull();
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('rejects oversized persisted payload', () => {
    const key = 'shogi2:test:oversized';
    localStorage.setItem(key, 'x'.repeat(220_000));

    const loaded = loadGameState(key);
    expect(loaded).toBeNull();
    expect(localStorage.getItem(key)).toBeNull();
  });
});
