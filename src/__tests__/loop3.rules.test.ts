import { createInitialState } from '../shogi/initialState';
import { generateLegalMoves, tryApplyMove } from '../shogi/legal';
import { getPieceAt } from '../shogi/moveGen';
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

describe('loop3 legal filters', () => {
  it('disallows moving pinned king guard and leaving king in check', () => {
    const state = emptyState('black');
    state.board[8 * 9 + 4] = { side: 'black', type: 'OU', promoted: false };
    state.board[7 * 9 + 4] = { side: 'black', type: 'KI', promoted: false };
    state.board[0 * 9 + 4] = { side: 'white', type: 'HI', promoted: false };
    state.board[0 * 9 + 0] = { side: 'white', type: 'OU', promoted: false };

    const illegal = tryApplyMove(state, {
      kind: 'move',
      from: { x: 4, y: 7 },
      to: { x: 3, y: 7 },
      promote: false,
    });

    expect(illegal).toBeNull();
  });

  it('disallows nifu pawn drop', () => {
    const state = emptyState('black');
    state.board[8 * 9 + 4] = { side: 'black', type: 'OU', promoted: false };
    state.board[0 * 9 + 4] = { side: 'white', type: 'OU', promoted: false };
    state.board[6 * 9 + 4] = { side: 'black', type: 'FU', promoted: false };
    state.hands.black.FU = 1;

    const legalDrops = generateLegalMoves(state).filter(
      (move) => move.kind === 'drop' && move.pieceType === 'FU' && move.to.x === 4
    );

    expect(legalDrops).toHaveLength(0);
  });

  it('disallows dropping knight to the last two ranks', () => {
    const state = emptyState('black');
    state.board[8 * 9 + 4] = { side: 'black', type: 'OU', promoted: false };
    state.board[0 * 9 + 4] = { side: 'white', type: 'OU', promoted: false };
    state.hands.black.KE = 1;

    const legalDrops = generateLegalMoves(state).filter(
      (move) => move.kind === 'drop' && move.pieceType === 'KE' && move.to.x === 4
    );

    expect(legalDrops.some((drop) => drop.to.y <= 1)).toBe(false);
  });

  it('disallows pawn-drop checkmate (uchi-fu-zume)', () => {
    const state = emptyState('black');
    state.board[8 * 9 + 4] = { side: 'black', type: 'OU', promoted: false };
    state.board[0 * 9 + 4] = { side: 'white', type: 'OU', promoted: false };
    state.board[0 * 9 + 3] = { side: 'white', type: 'KY', promoted: false };
    state.board[0 * 9 + 5] = { side: 'white', type: 'KY', promoted: false };
    state.board[1 * 9 + 3] = { side: 'white', type: 'FU', promoted: false };
    state.board[1 * 9 + 5] = { side: 'white', type: 'FU', promoted: false };
    state.board[2 * 9 + 3] = { side: 'black', type: 'KI', promoted: false };
    state.board[2 * 9 + 5] = { side: 'black', type: 'KI', promoted: false };
    state.hands.black.FU = 1;

    const targetDrop = generateLegalMoves(state).find(
      (move) => move.kind === 'drop' && move.pieceType === 'FU' && move.to.x === 4 && move.to.y === 1
    );

    expect(targetDrop).toBeUndefined();
  });

  it('allows legal capture that resolves check', () => {
    const state = emptyState('black');
    state.board[8 * 9 + 4] = { side: 'black', type: 'OU', promoted: false };
    state.board[7 * 9 + 4] = { side: 'black', type: 'HI', promoted: false };
    state.board[0 * 9 + 4] = { side: 'white', type: 'HI', promoted: false };
    state.board[0 * 9 + 0] = { side: 'white', type: 'OU', promoted: false };

    const next = tryApplyMove(state, {
      kind: 'move',
      from: { x: 4, y: 7 },
      to: { x: 4, y: 0 },
      promote: false,
    });

    expect(next).not.toBeNull();
    expect(getPieceAt(next!, { x: 4, y: 0 })?.side).toBe('black');
  });
});
