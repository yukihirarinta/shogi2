import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShogiBoard from '../components/ShogiBoard';

describe('loop6 undo and reset controls', () => {
  it('enables undo after a move and restores previous state', async () => {
    const user = userEvent.setup();
    render(<ShogiBoard />);

    const undo = screen.getByRole('button', { name: '一手戻す' });
    const from = screen.getByRole('button', { name: '筋5段7' });
    const to = screen.getByRole('button', { name: '筋5段6' });

    expect(undo).toBeDisabled();

    await user.click(from);
    await user.click(to);

    expect(screen.getByText('手番: 後手')).toBeInTheDocument();
    expect(undo).toBeEnabled();

    await user.click(undo);

    expect(screen.getByText('手番: 先手')).toBeInTheDocument();
    expect(undo).toBeDisabled();
    expect(screen.getByRole('button', { name: '筋5段7' })).toHaveTextContent('歩');
    expect(screen.getByRole('button', { name: '筋5段6' })).not.toHaveTextContent('歩');
  });

  it('resets to the initial board and clears selection state', async () => {
    const user = userEvent.setup();
    render(<ShogiBoard />);

    const from = screen.getByRole('button', { name: '筋5段7' });
    const to = screen.getByRole('button', { name: '筋5段6' });

    await user.click(from);
    await user.click(to);
    expect(screen.getByText('手番: 後手')).toBeInTheDocument();

    const whitePawn = screen.getByRole('button', { name: '筋5段3' });
    await user.click(whitePawn);
    expect(whitePawn).toHaveAttribute('data-selected', 'true');

    await user.click(screen.getByRole('button', { name: 'リセット' }));

    expect(screen.getByText('手番: 先手')).toBeInTheDocument();
    expect(screen.getByText('状態: 対局中')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '筋5段7' })).toHaveTextContent('歩');
    expect(screen.getByRole('button', { name: '筋5段6' })).not.toHaveTextContent('歩');
    expect(screen.getByRole('button', { name: '筋5段3' })).toHaveAttribute('data-selected', 'false');
    expect(screen.getByRole('button', { name: '一手戻す' })).toBeDisabled();
  });
});
