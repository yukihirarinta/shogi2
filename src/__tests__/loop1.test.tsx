import { render, screen, within } from '@testing-library/react';
import App from '../App';

describe('loop1 minimal board', () => {
  it('renders 81 squares', () => {
    render(<App />);
    const board = screen.getByRole('grid', { name: '9x9将棋盤' });
    expect(within(board).getAllByRole('button')).toHaveLength(81);
  });

  it('renders turn info', () => {
    render(<App />);
    expect(screen.getByText('手番: 先手')).toBeInTheDocument();
    expect(screen.getByText('状態: 対局中')).toBeInTheDocument();
  });

  it('has initial pieces', () => {
    render(<App />);
    expect(screen.getAllByText('歩').length).toBe(18);
    expect(screen.getAllByText('玉').length).toBe(2);
  });
});
