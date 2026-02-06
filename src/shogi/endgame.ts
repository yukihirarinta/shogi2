import { generatePseudoMovesForSquare, oppositeSide, squareFromIndex } from './moveGen';
import type { GameState, Side, Square } from './types';

export function findKingSquare(state: GameState, side: Side): Square | null {
  for (let i = 0; i < state.board.length; i += 1) {
    const piece = state.board[i];
    if (piece && piece.side === side && piece.type === 'OU') {
      return squareFromIndex(i);
    }
  }
  return null;
}

export function isSquareAttacked(state: GameState, target: Square, attacker: Side): boolean {
  for (let i = 0; i < state.board.length; i += 1) {
    const piece = state.board[i];
    if (!piece || piece.side !== attacker) {
      continue;
    }

    const from = squareFromIndex(i);
    const moves = generatePseudoMovesForSquare(state, from);
    if (moves.some((move) => move.to.x === target.x && move.to.y === target.y)) {
      return true;
    }
  }

  return false;
}

export function isInCheck(state: GameState, side: Side): boolean {
  const king = findKingSquare(state, side);
  if (!king) {
    return true;
  }

  return isSquareAttacked(state, king, oppositeSide(side));
}
