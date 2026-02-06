import type { Board, GameState, HandPieceType, Piece } from './types';

const HAND_ORDER: HandPieceType[] = ['FU', 'KY', 'KE', 'GI', 'KI', 'KA', 'HI'];

function pieceCode(piece: Piece): string {
  const side = piece.side === 'black' ? 'b' : 'w';
  const promoted = piece.promoted ? '+' : '';
  return `${side}${promoted}${piece.type}`;
}

function boardKey(board: Board): string {
  return board.map((piece) => (piece ? pieceCode(piece) : '__')).join('|');
}

function handKey(state: GameState): string {
  const black = HAND_ORDER.map((type) => `${type}${state.hands.black[type]}`).join(',');
  const white = HAND_ORDER.map((type) => `${type}${state.hands.white[type]}`).join(',');
  return `${black}/${white}`;
}

export function createPositionKey(state: GameState): string {
  return `${boardKey(state.board)}:${handKey(state)}:${state.turn}`;
}
