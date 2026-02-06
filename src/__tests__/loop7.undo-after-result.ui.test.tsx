import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ShogiBoard from '../components/ShogiBoard';
import { createInitialState } from '../shogi/initialState';
import type { GameState } from '../shogi/types';

function createCheckmateInOneState(): GameState {
  const state = createInitialState();
  state.board = state.board.map(() => null);
  state.hands.black = { FU: 0, KY: 0, KE: 0, GI: 0, KI: 0, KA: 0, HI: 0 };
  state.hands.white = { FU: 0, KY: 0, KE: 0, GI: 0, KI: 0, KA: 0, HI: 0 };
  state.turn = 'black';
  state.result = { status: 'playing' };
  state.positionCounts = {};

  state.board[8 * 9 + 4] = { side: 'black', type: 'OU', promoted: false };
  state.board[0 * 9 + 4] = { side: 'white', type: 'OU', promoted: false };
  state.board[0 * 9 + 3] = { side: 'white', type: 'KY', promoted: false };
  state.board[0 * 9 + 5] = { side: 'white', type: 'KY', promoted: false };
  state.board[1 * 9 + 4] = { side: 'white', type: 'FU', promoted: false };
  state.board[2 * 9 + 4] = { side: 'black', type: 'HI', promoted: false };
  state.board[2 * 9 + 3] = { side: 'black', type: 'KI', promoted: false };
  state.board[2 * 9 + 5] = { side: 'black', type: 'KI', promoted: false };

  return state;
}

describe('loop7 undo after game result', () => {
  it('allows undo even after checkmate is reached', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ShogiBoard initialState={createCheckmateInOneState()} />);

    await user.click(screen.getByRole('button', { name: '筋5段3' }));
    await user.click(screen.getByRole('button', { name: '筋5段2' }));

    expect(screen.getByText('状態: 先手勝ち（詰み）')).toBeInTheDocument();

    const undo = screen.getByRole('button', { name: '一手戻す' });
    expect(undo).toBeEnabled();

    await user.click(undo);

    expect(screen.getByText('状態: 対局中')).toBeInTheDocument();
    expect(screen.getByText('手番: 先手')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '筋5段3' })).toHaveTextContent('飛');
    expect(screen.getByRole('button', { name: '筋5段2' })).not.toHaveTextContent('飛');

    confirmSpy.mockRestore();
  });
});
