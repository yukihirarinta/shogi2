import { createInitialState } from '../shogi/initialState';
import { tryApplyMove } from '../shogi/legal';
import { getPieceAt } from '../shogi/moveGen';
import type { GameState } from '../shogi/types';

function createCaptureState(): GameState {
  const state = createInitialState();
  state.board = state.board.map(() => null);
  state.turn = 'black';
  state.board[6 * 9 + 4] = { side: 'black', type: 'FU', promoted: false };
  state.board[5 * 9 + 4] = { side: 'white', type: 'GI', promoted: false };
  state.board[8 * 9 + 4] = { side: 'black', type: 'OU', promoted: false };
  state.board[0 * 9 + 4] = { side: 'white', type: 'OU', promoted: false };
  return state;
}

describe('loop2 move and capture basics', () => {
  it('allows basic pawn move for black', () => {
    const state = createInitialState();
    const next = tryApplyMove(state, {
      kind: 'move',
      from: { x: 4, y: 6 },
      to: { x: 4, y: 5 },
      promote: false,
    });

    expect(next).not.toBeNull();
    expect(next?.turn).toBe('white');
    expect(getPieceAt(next!, { x: 4, y: 5 })?.type).toBe('FU');
    expect(getPieceAt(next!, { x: 4, y: 6 })).toBeNull();
  });

  it('moves captured piece into hand', () => {
    const state = createCaptureState();
    const next = tryApplyMove(state, {
      kind: 'move',
      from: { x: 4, y: 6 },
      to: { x: 4, y: 5 },
      promote: false,
    });

    expect(next).not.toBeNull();
    expect(next?.hands.black.GI).toBe(1);
  });

  it('rejects illegal jump move for pawn', () => {
    const state = createInitialState();
    const next = tryApplyMove(state, {
      kind: 'move',
      from: { x: 4, y: 6 },
      to: { x: 4, y: 4 },
      promote: false,
    });

    expect(next).toBeNull();
  });
});
