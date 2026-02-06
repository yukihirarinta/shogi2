import type { Board, GameState, Hand, Piece, Side } from './types';
import { createPositionKey } from './repetition';

const EMPTY_HAND: Hand = {
  FU: 0,
  KY: 0,
  KE: 0,
  GI: 0,
  KI: 0,
  KA: 0,
  HI: 0,
};

const START_SFEN_BOARD = [
  'lnsgkgsnl',
  '1r5b1',
  'ppppppppp',
  '9',
  '9',
  '9',
  'PPPPPPPPP',
  '1B5R1',
  'LNSGKGSNL',
];

function cloneHand(hand: Hand): Hand {
  return { ...hand };
}

function parsePiece(char: string): Piece {
  const side: Side = char === char.toUpperCase() ? 'black' : 'white';
  const piece = char.toUpperCase();

  switch (piece) {
    case 'P':
      return { side, type: 'FU', promoted: false };
    case 'L':
      return { side, type: 'KY', promoted: false };
    case 'N':
      return { side, type: 'KE', promoted: false };
    case 'S':
      return { side, type: 'GI', promoted: false };
    case 'G':
      return { side, type: 'KI', promoted: false };
    case 'B':
      return { side, type: 'KA', promoted: false };
    case 'R':
      return { side, type: 'HI', promoted: false };
    case 'K':
      return { side, type: 'OU', promoted: false };
    default:
      throw new Error(`Unknown piece: ${char}`);
  }
}

function createInitialBoard(): Board {
  const board: Board = Array.from({ length: 81 }, () => null);

  START_SFEN_BOARD.forEach((rank, y) => {
    let x = 0;
    for (const char of rank) {
      const count = Number(char);
      if (Number.isInteger(count) && count > 0) {
        x += count;
        continue;
      }
      board[y * 9 + x] = parsePiece(char);
      x += 1;
    }
  });

  return board;
}

export function createInitialState(): GameState {
  const board = createInitialBoard();
  const baseState: GameState = {
    board,
    hands: {
      black: cloneHand(EMPTY_HAND),
      white: cloneHand(EMPTY_HAND),
    },
    turn: 'black',
    moveNumber: 1,
    history: [],
    positionCounts: {},
    result: { status: 'playing' },
  };

  const key = createPositionKey(baseState);
  baseState.positionCounts[key] = 1;
  return baseState;
}
