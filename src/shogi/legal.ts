import { isInCheck } from './endgame';
import { createPositionKey } from './repetition';
import {
  generatePseudoMoves,
  getPieceAt,
  indexFromSquare,
  isInsideBoard,
  movesEqual,
  oppositeSide,
} from './moveGen';
import {
  BOARD_SIZE,
  HAND_PIECE_TYPES,
  type DropMove,
  type GameMove,
  type GameResult,
  type GameState,
  type HandPieceType,
  type MoveRecord,
  type Piece,
  type Side,
  type Square,
} from './types';

interface GenerateLegalOptions {
  skipPawnDropMateCheck?: boolean;
}

const MAX_HISTORY_LENGTH = 2_048;

function clonePiece(piece: Piece): Piece {
  return {
    side: piece.side,
    type: piece.type,
    promoted: piece.promoted,
  };
}

export function cloneGameState(state: GameState): GameState {
  return {
    board: state.board.map((piece) => (piece ? clonePiece(piece) : null)),
    hands: {
      black: { ...state.hands.black },
      white: { ...state.hands.white },
    },
    turn: state.turn,
    moveNumber: state.moveNumber,
    history: [...state.history],
    positionCounts: { ...state.positionCounts },
    result: state.result,
  };
}

function handPieceTypeFromPiece(piece: Piece): HandPieceType | null {
  if (piece.type === 'OU') {
    return null;
  }
  return piece.type;
}

function lastRank(side: Side): number {
  return side === 'black' ? 0 : BOARD_SIZE - 1;
}

function secondLastRank(side: Side): number {
  return side === 'black' ? 1 : BOARD_SIZE - 2;
}

function violatesDropDestinationRule(side: Side, pieceType: HandPieceType, to: Square): boolean {
  if (pieceType === 'FU' || pieceType === 'KY') {
    return to.y === lastRank(side);
  }

  if (pieceType === 'KE') {
    return to.y === lastRank(side) || to.y === secondLastRank(side);
  }

  return false;
}

function hasPawnOnFile(state: GameState, side: Side, x: number): boolean {
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    const piece = getPieceAt(state, { x, y });
    if (piece && piece.side === side && piece.type === 'FU' && !piece.promoted) {
      return true;
    }
  }
  return false;
}

function generateDropMoves(state: GameState, side: Side): DropMove[] {
  const drops: DropMove[] = [];
  const hand = state.hands[side];

  for (const pieceType of HAND_PIECE_TYPES) {
    if (hand[pieceType] <= 0) {
      continue;
    }

    for (let y = 0; y < BOARD_SIZE; y += 1) {
      for (let x = 0; x < BOARD_SIZE; x += 1) {
        const to = { x, y };
        if (!isInsideBoard(to)) {
          continue;
        }

        if (getPieceAt(state, to)) {
          continue;
        }

        if (violatesDropDestinationRule(side, pieceType, to)) {
          continue;
        }

        if (pieceType === 'FU' && hasPawnOnFile(state, side, x)) {
          continue;
        }

        drops.push({
          kind: 'drop',
          pieceType,
          to,
        });
      }
    }
  }

  return drops;
}

function appendHistory(state: GameState, record: MoveRecord): void {
  const nextHistory = [...state.history, record];
  if (nextHistory.length > MAX_HISTORY_LENGTH) {
    nextHistory.shift();
  }
  state.history = nextHistory;
}

function updatePositionCount(state: GameState): void {
  const key = createPositionKey(state);
  const count = state.positionCounts[key] ?? 0;
  state.positionCounts[key] = count + 1;
}

function evaluateResult(state: GameState): GameResult {
  const key = createPositionKey(state);
  if ((state.positionCounts[key] ?? 0) >= 4) {
    return { status: 'repetition' };
  }

  const sideToMove = state.turn;
  const legal = generateLegalMoves(state, { skipPawnDropMateCheck: true });
  if (legal.length === 0 && isInCheck(state, sideToMove)) {
    return { status: 'checkmate', winner: oppositeSide(sideToMove) };
  }

  return { status: 'playing' };
}

function applyMoveRaw(state: GameState, move: GameMove): GameState {
  const next = cloneGameState(state);

  if (move.kind === 'drop') {
    const handCount = next.hands[next.turn][move.pieceType];
    if (handCount <= 0) {
      throw new Error(`No hand piece: ${move.pieceType}`);
    }

    if (next.board[indexFromSquare(move.to)] !== null) {
      throw new Error('Drop destination is occupied');
    }

    next.hands[next.turn][move.pieceType] = handCount - 1;
    next.board[indexFromSquare(move.to)] = {
      side: next.turn,
      type: move.pieceType,
      promoted: false,
    };

    appendHistory(next, {
      side: state.turn,
      move,
      pieceType: move.pieceType,
    });
  } else {
    const piece = getPieceAt(next, move.from);
    if (!piece || piece.side !== next.turn) {
      throw new Error('Invalid source piece');
    }

    const toIndex = indexFromSquare(move.to);
    const fromIndex = indexFromSquare(move.from);
    const captured = next.board[toIndex];

    next.board[fromIndex] = null;
    next.board[toIndex] = {
      side: piece.side,
      type: piece.type,
      promoted: piece.promoted || move.promote,
    };

    const capturedType = captured ? handPieceTypeFromPiece(captured) : null;
    if (capturedType) {
      next.hands[next.turn][capturedType] += 1;
    }

    const record: MoveRecord = {
      side: state.turn,
      move,
      pieceType: piece.type,
    };
    if (capturedType) {
      record.captured = capturedType;
    }
    appendHistory(next, record);
  }

  next.turn = oppositeSide(next.turn);
  next.moveNumber += 1;
  updatePositionCount(next);
  return next;
}

function causesPawnDropMate(state: GameState, move: GameMove): boolean {
  if (move.kind !== 'drop' || move.pieceType !== 'FU') {
    return false;
  }

  const next = applyMoveRaw(state, move);
  const defender = next.turn;
  if (!isInCheck(next, defender)) {
    return false;
  }

  const legalReplies = generateLegalMoves(next, { skipPawnDropMateCheck: true });
  return legalReplies.length === 0;
}

export function generateLegalMoves(state: GameState, options: GenerateLegalOptions = {}): GameMove[] {
  if (state.result.status !== 'playing') {
    return [];
  }

  const side = state.turn;
  const candidates: GameMove[] = [
    ...generatePseudoMoves(state, side),
    ...generateDropMoves(state, side),
  ];

  const legal: GameMove[] = [];

  for (const candidate of candidates) {
    const next = applyMoveRaw(state, candidate);

    if (isInCheck(next, side)) {
      continue;
    }

    if (!options.skipPawnDropMateCheck && causesPawnDropMate(state, candidate)) {
      continue;
    }

    legal.push(candidate);
  }

  return legal;
}

export function applyMoveUnchecked(state: GameState, move: GameMove): GameState {
  const next = applyMoveRaw(state, move);
  next.result = evaluateResult(next);
  return next;
}

function isSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

function isValidSquare(square: Square): boolean {
  return (
    isSafeInteger(square.x) &&
    isSafeInteger(square.y) &&
    square.x >= 0 &&
    square.x < BOARD_SIZE &&
    square.y >= 0 &&
    square.y < BOARD_SIZE
  );
}

function isValidMoveInput(move: GameMove): boolean {
  if (move.kind === 'move') {
    return isValidSquare(move.from) && isValidSquare(move.to) && typeof move.promote === 'boolean';
  }

  if (move.kind === 'drop') {
    return HAND_PIECE_TYPES.includes(move.pieceType) && isValidSquare(move.to);
  }

  return false;
}

export function tryApplyMove(state: GameState, move: GameMove): GameState | null {
  if (!isValidMoveInput(move)) {
    return null;
  }

  const legalMoves = generateLegalMoves(state);
  const found = legalMoves.some((candidate) => movesEqual(candidate, move));
  if (!found) {
    return null;
  }

  return applyMoveUnchecked(state, move);
}

export function isOwnPiece(state: GameState, side: Side, square: Square): boolean {
  const piece = getPieceAt(state, square);
  return Boolean(piece && piece.side === side);
}
