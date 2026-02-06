export const BOARD_SIZE = 9;

export type Side = 'black' | 'white';

export type PieceType = 'FU' | 'KY' | 'KE' | 'GI' | 'KI' | 'KA' | 'HI' | 'OU';

export type HandPieceType = Exclude<PieceType, 'OU'>;

export const HAND_PIECE_TYPES: HandPieceType[] = ['FU', 'KY', 'KE', 'GI', 'KI', 'KA', 'HI'];

export interface Square {
  x: number;
  y: number;
}

export interface Piece {
  side: Side;
  type: PieceType;
  promoted: boolean;
}

export type Board = Array<Piece | null>;

export interface Hand {
  FU: number;
  KY: number;
  KE: number;
  GI: number;
  KI: number;
  KA: number;
  HI: number;
}

export interface Hands {
  black: Hand;
  white: Hand;
}

export interface Move {
  kind: 'move';
  from: Square;
  to: Square;
  promote: boolean;
}

export interface DropMove {
  kind: 'drop';
  pieceType: HandPieceType;
  to: Square;
}

export type GameMove = Move | DropMove;

export interface MoveRecord {
  side: Side;
  move: GameMove;
  pieceType: PieceType;
  captured?: HandPieceType;
}

export type GameResult =
  | { status: 'playing' }
  | { status: 'checkmate'; winner: Side }
  | { status: 'repetition' };

export interface GameState {
  board: Board;
  hands: Hands;
  turn: Side;
  moveNumber: number;
  history: MoveRecord[];
  positionCounts: Record<string, number>;
  result: GameResult;
}

export interface ShogiBoardProps {
  initialState?: GameState;
  storageKey?: string;
  onMove?: (record: MoveRecord) => void;
  onResult?: (result: GameResult) => void;
}
