import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShogiBoard from '../components/ShogiBoard';
import { createInitialState } from '../shogi/initialState';
import type { GameState } from '../shogi/types';

function createDropState(): GameState {
  const state = createInitialState();
  state.board = state.board.map(() => null);
  state.turn = 'black';
  state.hands.black.FU = 1;
  state.board[8 * 9 + 4] = { side: 'black', type: 'OU', promoted: false };
  state.board[0 * 9 + 4] = { side: 'white', type: 'OU', promoted: false };
  state.positionCounts = {};
  return state;
}

describe('loop3 UI drop interaction', () => {
  it('drops a pawn from hand', async () => {
    const user = userEvent.setup();
    render(<ShogiBoard initialState={createDropState()} />);

    const handPawn = screen.getByRole('button', { name: '先手持ち駒歩' });
    await user.click(handPawn);

    const target = screen.getByRole('button', { name: '筋5段5' });
    await user.click(target);

    expect(screen.getByText('手番: 後手')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '先手持ち駒歩' })).toHaveTextContent('歩 (0)');
  });
});
