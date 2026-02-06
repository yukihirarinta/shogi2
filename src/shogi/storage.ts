import { BOARD_SIZE, HAND_PIECE_TYPES, type GameResult, type GameState, type Piece, type Side } from './types';

export const DEFAULT_STORAGE_KEY = 'shogi2:game:v1';

const PIECE_TYPES = ['FU', 'KY', 'KE', 'GI', 'KI', 'KA', 'HI', 'OU'] as const;
const MAX_STORED_STATE_LENGTH = 200_000;
const MAX_HISTORY_LENGTH = 2_048;
const MAX_POSITION_REPEAT = 16;
const MAX_POSITION_KEY_LENGTH = 600;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSide(value: unknown): value is Side {
  return value === 'black' || value === 'white';
}

function isPieceType(value: unknown): value is (typeof PIECE_TYPES)[number] {
  return typeof value === 'string' && PIECE_TYPES.includes(value as (typeof PIECE_TYPES)[number]);
}

function isHandPieceType(value: unknown): value is (typeof HAND_PIECE_TYPES)[number] {
  return typeof value === 'string' && HAND_PIECE_TYPES.includes(value as (typeof HAND_PIECE_TYPES)[number]);
}

function isPiece(value: unknown): value is Piece {
  if (!isRecord(value)) {
    return false;
  }

  return isSide(value.side) && typeof value.promoted === 'boolean' && isPieceType(value.type);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isSquare(value: unknown): value is { x: number; y: number } {
  if (!isRecord(value)) {
    return false;
  }

  const x = value.x;
  const y = value.y;
  if (typeof x !== 'number' || typeof y !== 'number') {
    return false;
  }

  return (
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    x >= 0 &&
    x < BOARD_SIZE &&
    y >= 0 &&
    y < BOARD_SIZE
  );
}

function isValidMove(value: unknown): boolean {
  if (!isRecord(value) || typeof value.kind !== 'string') {
    return false;
  }

  if (value.kind === 'move') {
    return isSquare(value.from) && isSquare(value.to) && typeof value.promote === 'boolean';
  }

  if (value.kind === 'drop') {
    return isHandPieceType(value.pieceType) && isSquare(value.to);
  }

  return false;
}

function isValidMoveRecord(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  if (!isSide(value.side)) {
    return false;
  }

  if (!isPieceType(value.pieceType)) {
    return false;
  }

  if (!isValidMove(value.move)) {
    return false;
  }

  if (value.captured !== undefined && !isHandPieceType(value.captured)) {
    return false;
  }

  return true;
}

function isValidHistory(value: unknown): value is GameState['history'] {
  if (!Array.isArray(value) || value.length > MAX_HISTORY_LENGTH) {
    return false;
  }

  return value.every((record) => isValidMoveRecord(record));
}

function isValidBoard(board: unknown): board is GameState['board'] {
  if (!Array.isArray(board) || board.length !== BOARD_SIZE * BOARD_SIZE) {
    return false;
  }

  let blackKing = 0;
  let whiteKing = 0;

  for (const square of board) {
    if (square === null) {
      continue;
    }

    if (!isPiece(square)) {
      return false;
    }

    if (square.type === 'OU') {
      if (square.promoted) {
        return false;
      }
      if (square.side === 'black') {
        blackKing += 1;
      } else {
        whiteKing += 1;
      }
    }
  }

  return blackKing === 1 && whiteKing === 1;
}

function isValidHand(value: unknown): value is GameState['hands']['black'] {
  if (!isRecord(value)) {
    return false;
  }

  return HAND_PIECE_TYPES.every((pieceType) => {
    const count = value[pieceType];
    return isNonNegativeInteger(count) && count <= 18;
  });
}

function isValidResult(value: unknown): value is GameResult {
  if (!isRecord(value) || typeof value.status !== 'string') {
    return false;
  }

  if (value.status === 'playing' || value.status === 'repetition') {
    return true;
  }

  if (value.status === 'checkmate') {
    return isSide(value.winner);
  }

  return false;
}

function isValidPositionCounts(value: unknown): value is Record<string, number> {
  if (!isRecord(value)) {
    return false;
  }

  return Object.entries(value).every(([key, count]) => {
    return (
      key.length > 0 &&
      key.length <= MAX_POSITION_KEY_LENGTH &&
      isNonNegativeInteger(count) &&
      count <= MAX_POSITION_REPEAT
    );
  });
}

function isValidState(value: unknown): value is GameState {
  if (!isRecord(value)) {
    return false;
  }

  if (!isValidBoard(value.board)) {
    return false;
  }

  if (!isRecord(value.hands)) {
    return false;
  }

  if (!isValidHand(value.hands.black) || !isValidHand(value.hands.white)) {
    return false;
  }

  if (!isSide(value.turn)) {
    return false;
  }

  if (!isNonNegativeInteger(value.moveNumber) || value.moveNumber < 1 || value.moveNumber > 10_000) {
    return false;
  }

  if (!isValidHistory(value.history)) {
    return false;
  }

  if (!isValidPositionCounts(value.positionCounts)) {
    return false;
  }

  if (!isValidResult(value.result)) {
    return false;
  }

  return true;
}

export function loadGameState(storageKey: string = DEFAULT_STORAGE_KEY): GameState | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    if (raw.length > MAX_STORED_STATE_LENGTH) {
      localStorage.removeItem(storageKey);
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isValidState(parsed)) {
      localStorage.removeItem(storageKey);
      return null;
    }

    return parsed;
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
}

export function saveGameState(state: GameState, storageKey: string = DEFAULT_STORAGE_KEY): void {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(storageKey, serialized);
  } catch {
    localStorage.removeItem(storageKey);
  }
}
