import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BoardSquare from '../components/BoardSquare';
import { createInitialState } from '../shogi/initialState';
import { generatePseudoMovesForSquare, movesEqual } from '../shogi/moveGen';
import { loadGameState, saveGameState } from '../shogi/storage';
import type { GameMove, GameState, Piece } from '../shogi/types';
import { vi } from 'vitest';

function emptyState(turn: 'black' | 'white' = 'black'): GameState {
  const state = createInitialState();
  state.board = state.board.map(() => null);
  state.turn = turn;
  state.result = { status: 'playing' };
  state.positionCounts = {};
  state.board[8 * 9 + 4] = { side: 'black', type: 'OU', promoted: false };
  state.board[0 * 9 + 4] = { side: 'white', type: 'OU', promoted: false };
  return state;
}

describe('loop5 coverage and security extras', () => {
  it('renders all promoted labels and passes click square', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    const samples: Piece[] = [
      { side: 'black', type: 'FU', promoted: true },
      { side: 'black', type: 'KY', promoted: true },
      { side: 'black', type: 'KE', promoted: true },
      { side: 'black', type: 'GI', promoted: true },
      { side: 'black', type: 'KA', promoted: true },
      { side: 'black', type: 'HI', promoted: true },
      { side: 'black', type: 'KI', promoted: true },
      { side: 'black', type: 'OU', promoted: true },
    ];

    const labels = ['と', '成香', '成桂', '成銀', '馬', '龍', '金', '玉'];

    for (let i = 0; i < samples.length; i += 1) {
      const piece = samples[i];
      if (!piece) {
        continue;
      }
      render(
        <BoardSquare
          square={{ x: i % 9, y: 0 }}
          piece={piece}
          selected={i === 0}
          legalTarget={i === 1}
          onClick={onClick}
        />
      );
    }

    labels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });

    const first = screen.getByRole('button', { name: '筋9段1' });
    await user.click(first);
    expect(onClick).toHaveBeenCalledWith({ x: 0, y: 0 });
  });

  it('covers promoted movement and move equality edges', () => {
    const state = emptyState('black');
    state.board[4 * 9 + 4] = { side: 'black', type: 'KA', promoted: true };
    state.board[4 * 9 + 7] = { side: 'white', type: 'GI', promoted: false };

    const bishopLike = generatePseudoMovesForSquare(state, { x: 4, y: 4 });
    expect(bishopLike.some((move) => move.to.x === 4 && move.to.y === 3)).toBe(true);
    expect(bishopLike.some((move) => move.to.x === 5 && move.to.y === 4)).toBe(true);

    state.board[5 * 9 + 5] = { side: 'black', type: 'HI', promoted: true };
    const rookLike = generatePseudoMovesForSquare(state, { x: 5, y: 5 });
    expect(rookLike.some((move) => move.to.x === 6 && move.to.y === 4)).toBe(true);

    const emptyMoves = generatePseudoMovesForSquare(state, { x: 1, y: 1 });
    expect(emptyMoves).toHaveLength(0);

    const move: GameMove = {
      kind: 'move',
      from: { x: 4, y: 4 },
      to: { x: 4, y: 3 },
      promote: false,
    };
    const drop: GameMove = { kind: 'drop', pieceType: 'FU', to: { x: 4, y: 3 } };
    expect(movesEqual(move, drop)).toBe(false);
  });

  it('covers mandatory promotion for white knight', () => {
    const state = emptyState('white');
    state.board[6 * 9 + 4] = { side: 'white', type: 'KE', promoted: false };

    const moves = generatePseudoMovesForSquare(state, { x: 4, y: 6 });
    const mustPromoteTargets = moves.filter((move) => move.to.y >= 7);
    expect(mustPromoteTargets.every((move) => move.promote)).toBe(true);
  });

  it('rejects malformed JSON and invalid position counts', () => {
    const malformedKey = 'shogi2:test:malformed-json';
    localStorage.setItem(malformedKey, '{not-json');

    expect(loadGameState(malformedKey)).toBeNull();
    expect(localStorage.getItem(malformedKey)).toBeNull();

    const badCountKey = 'shogi2:test:bad-count';
    const state = createInitialState();
    state.positionCounts.bad = 17;
    localStorage.setItem(badCountKey, JSON.stringify(state));

    expect(loadGameState(badCountKey)).toBeNull();
    expect(localStorage.getItem(badCountKey)).toBeNull();
  });

  it('removes storage on save failure', () => {
    const key = 'shogi2:test:save-failure';
    const state = createInitialState();

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const removeSpy = vi.spyOn(Storage.prototype, 'removeItem');

    saveGameState(state, key);

    expect(removeSpy).toHaveBeenCalledWith(key);

    setItemSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
