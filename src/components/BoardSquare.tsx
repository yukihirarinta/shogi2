import type { Piece, PieceType, Square } from '../shogi/types';

const PIECE_LABELS: Record<PieceType, string> = {
  FU: '歩',
  KY: '香',
  KE: '桂',
  GI: '銀',
  KI: '金',
  KA: '角',
  HI: '飛',
  OU: '玉',
};

function renderPiece(piece: Piece): string {
  if (!piece.promoted) {
    return PIECE_LABELS[piece.type];
  }

  switch (piece.type) {
    case 'FU':
      return 'と';
    case 'KY':
      return '成香';
    case 'KE':
      return '成桂';
    case 'GI':
      return '成銀';
    case 'KA':
      return '馬';
    case 'HI':
      return '龍';
    case 'KI':
    case 'OU':
      return PIECE_LABELS[piece.type];
    default:
      throw new Error(`Unhandled piece type: ${String(piece.type)}`);
  }
}

interface BoardSquareProps {
  square: Square;
  piece: Piece | null;
  selected: boolean;
  legalTarget: boolean;
  onClick: (square: Square) => void;
}

export default function BoardSquare({
  square,
  piece,
  selected,
  legalTarget,
  onClick,
}: BoardSquareProps) {
  return (
    <button
      type="button"
      className="square"
      data-occupied={Boolean(piece)}
      data-selected={selected}
      data-legal-target={legalTarget}
      onClick={() => onClick(square)}
      aria-label={`筋${9 - square.x}段${square.y + 1}`}
    >
      {piece ? (
        <span className="piece" data-side={piece.side}>
          {renderPiece(piece)}
        </span>
      ) : null}
    </button>
  );
}
