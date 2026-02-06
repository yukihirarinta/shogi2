import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShogiBoard from '../components/ShogiBoard';

describe('loop2 board interaction', () => {
  it('updates turn after moving a pawn', async () => {
    const user = userEvent.setup();
    render(<ShogiBoard />);

    const from = screen.getByRole('button', { name: '筋5段7' });
    const to = screen.getByRole('button', { name: '筋5段6' });

    await user.click(from);
    await user.click(to);

    expect(screen.getByText('手番: 後手')).toBeInTheDocument();
  });
});
