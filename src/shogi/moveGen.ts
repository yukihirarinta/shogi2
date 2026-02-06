import {
  BOARD_SIZE,
  type GameMove,
  type GameState,
  type Move,
  type Piece,
  type PieceType,
  type Side,
  type Square,
} from './types';

interface Delta {
  dx: number;
  dy: number;
}

const GOLD_STEPS: Delta[] = [
  { dx: -1, dy: -1 },
  { dx: 0, dy: -1 },
  { dx: 1, dy: -1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
];

function sideFactor(side: Side): number {
  return side === 'black' ? 1 : -1;
}

function orientDelta(delta: Delta, side: Side): Delta {
  const factor = sideFactor(side);
  return { dx: delta.dx * factor, dy: delta.dy * factor };
}

function isPromotablePiece(type: PieceType): boolean {
  return type !== 'KI' && type !== 'OU';
}

export function indexFromSquare(square: Square): number {
  return square.y * BOARD_SIZE + square.x;
}

export function squareFromIndex(index: number): Square {
  return {
    x: index % BOARD_SIZE,
    y: Math.floor(index / BOARD_SIZE),
  };
}

export function isInsideBoard(square: Square): boolean {
  return (
    square.x >= 0 &&
    square.x < BOARD_SIZE &&
    square.y >= 0 &&
    square.y < BOARD_SIZE
  );
}

export function getPieceAt(state: GameState, square: Square): Piece | null {
  return state.board[indexFromSquare(square)] ?? null;
}

export function isSameSquare(a: Square, b: Square): boolean {
  return a.x === b.x && a.y === b.y;
}

export function oppositeSide(side: Side): Side {
  return side === 'black' ? 'white' : 'black';
}

function inPromotionZone(side: Side, square: Square): boolean {
  return side === 'black' ? square.y <= 2 : square.y >= 6;
}

function mandatoryPromotion(piece: Piece, to: Square): boolean {
  if (piece.promoted) {
    return false;
  }

  if (piece.side === 'black') {
    if ((piece.type === 'FU' || piece.type === 'KY') && to.y === 0) {
      return true;
    }
    if (piece.type === 'KE' && to.y <= 1) {
      return true;
    }
    return false;
  }

  if ((piece.type === 'FU' || piece.type === 'KY') && to.y === 8) {
    return true;
  }
  if (piece.type === 'KE' && to.y >= 7) {
    return true;
  }

  return false;
}

function expandPromotionMoves(piece: Piece, from: Square, to: Square): Move[] {
  if (!isPromotablePiece(piece.type) || piece.promoted) {
    return [{ kind: 'move', from, to, promote: false }];
  }

  const canPromote = inPromotionZone(piece.side, from) || inPromotionZone(piece.side, to);
  if (!canPromote) {
    return [{ kind: 'move', from, to, promote: false }];
  }

  if (mandatoryPromotion(piece, to)) {
    return [{ kind: 'move', from, to, promote: true }];
  }

  return [
    { kind: 'move', from, to, promote: false },
    { kind: 'move', from, to, promote: true },
  ];
}

function movementSpec(piece: Piece): { steps: Delta[]; slides: Delta[] } {
  if (piece.promoted) {
    switch (piece.type) {
      case 'FU':
      case 'KY':
      case 'KE':
      case 'GI':
        return { steps: GOLD_STEPS, slides: [] };
      case 'KA':
        return {
          steps: [
            { dx: 0, dy: -1 },
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 },
            { dx: 0, dy: 1 },
          ],
          slides: [
            { dx: -1, dy: -1 },
            { dx: 1, dy: -1 },
            { dx: -1, dy: 1 },
            { dx: 1, dy: 1 },
          ],
        };
      case 'HI':
        return {
          steps: [
            { dx: -1, dy: -1 },
            { dx: 1, dy: -1 },
            { dx: -1, dy: 1 },
            { dx: 1, dy: 1 },
          ],
          slides: [
            { dx: 0, dy: -1 },
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 },
            { dx: 0, dy: 1 },
          ],
        };
      case 'KI':
      case 'OU':
        return movementSpec({ ...piece, promoted: false });
    }
  }

  switch (piece.type) {
    case 'FU':
      return { steps: [{ dx: 0, dy: -1 }], slides: [] };
    case 'KY':
      return { steps: [], slides: [{ dx: 0, dy: -1 }] };
    case 'KE':
      return {
        steps: [
          { dx: -1, dy: -2 },
          { dx: 1, dy: -2 },
        ],
        slides: [],
      };
    case 'GI':
      return {
        steps: [
          { dx: -1, dy: -1 },
          { dx: 0, dy: -1 },
          { dx: 1, dy: -1 },
          { dx: -1, dy: 1 },
          { dx: 1, dy: 1 },
        ],
        slides: [],
      };
    case 'KI':
      return { steps: GOLD_STEPS, slides: [] };
    case 'KA':
      return {
        steps: [],
        slides: [
          { dx: -1, dy: -1 },
          { dx: 1, dy: -1 },
          { dx: -1, dy: 1 },
          { dx: 1, dy: 1 },
        ],
      };
    case 'HI':
      return {
        steps: [],
        slides: [
          { dx: 0, dy: -1 },
          { dx: -1, dy: 0 },
          { dx: 1, dy: 0 },
          { dx: 0, dy: 1 },
        ],
      };
    case 'OU':
      return {
        steps: [
          { dx: -1, dy: -1 },
          { dx: 0, dy: -1 },
          { dx: 1, dy: -1 },
          { dx: -1, dy: 0 },
          { dx: 1, dy: 0 },
          { dx: -1, dy: 1 },
          { dx: 0, dy: 1 },
          { dx: 1, dy: 1 },
        ],
        slides: [],
      };
  }
}

export function generatePseudoMovesForSquare(state: GameState, from: Square): Move[] {
  const piece = getPieceAt(state, from);
  if (!piece) {
    return [];
  }

  const { steps, slides } = movementSpec(piece);
  const moves: Move[] = [];

  for (const step of steps) {
    const delta = orientDelta(step, piece.side);
    const to = { x: from.x + delta.dx, y: from.y + delta.dy };
    if (!isInsideBoard(to)) {
      continue;
    }

    const target = getPieceAt(state, to);
    if (target && target.side === piece.side) {
      continue;
    }

    moves.push(...expandPromotionMoves(piece, from, to));
  }

  for (const slide of slides) {
    const delta = orientDelta(slide, piece.side);
    let to = { x: from.x + delta.dx, y: from.y + delta.dy };

    while (isInsideBoard(to)) {
      const target = getPieceAt(state, to);
      if (target && target.side === piece.side) {
        break;
      }

      moves.push(...expandPromotionMoves(piece, from, to));

      if (target && target.side !== piece.side) {
        break;
      }

      to = { x: to.x + delta.dx, y: to.y + delta.dy };
    }
  }

  return moves;
}

export function generatePseudoMoves(state: GameState, side: Side): Move[] {
  const moves: Move[] = [];
  for (let i = 0; i < state.board.length; i += 1) {
    const piece = state.board[i];
    if (!piece || piece.side !== side) {
      continue;
    }
    moves.push(...generatePseudoMovesForSquare(state, squareFromIndex(i)));
  }
  return moves;
}

export function movesEqual(a: GameMove, b: GameMove): boolean {
  if (a.kind !== b.kind) {
    return false;
  }

  if (a.kind === 'move' && b.kind === 'move') {
    return isSameSquare(a.from, b.from) && isSameSquare(a.to, b.to) && a.promote === b.promote;
  }

  if (a.kind === 'drop' && b.kind === 'drop') {
    return a.pieceType === b.pieceType && isSameSquare(a.to, b.to);
  }

  return false;
}
