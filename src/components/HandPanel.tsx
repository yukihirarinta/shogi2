import { HAND_PIECE_TYPES, type HandPieceType, type Hands, type Side } from '../shogi/types';

const LABELS: Record<HandPieceType, string> = {
  FU: '歩',
  KY: '香',
  KE: '桂',
  GI: '銀',
  KI: '金',
  KA: '角',
  HI: '飛',
};

interface HandPanelProps {
  hands: Hands;
  turn: Side;
  resultText: string;
  selectedDropPiece: HandPieceType | null;
  onSelectDropPiece: (pieceType: HandPieceType | null) => void;
  canUndo: boolean;
  onUndo: () => void;
  onReset: () => void;
}

function renderHand(
  side: Side,
  hands: Hands,
  turn: Side,
  selectedDropPiece: HandPieceType | null,
  onSelectDropPiece: (pieceType: HandPieceType | null) => void
) {
  const selectable = side === turn;

  return HAND_PIECE_TYPES.map((pieceType) => {
    const count = hands[side][pieceType];
    const disabled = !selectable || count === 0;
    const selected = selectedDropPiece === pieceType;

    return (
      <li key={`${side}-${pieceType}`}>
        <button
          type="button"
          className="hand-piece"
          data-selected={selected}
          disabled={disabled}
          onClick={() => onSelectDropPiece(selected ? null : pieceType)}
          aria-label={`${side === 'black' ? '先手' : '後手'}持ち駒${LABELS[pieceType]}`}
        >
          {LABELS[pieceType]} ({count})
        </button>
      </li>
    );
  });
}

export default function HandPanel({
  hands,
  turn,
  resultText,
  selectedDropPiece,
  onSelectDropPiece,
  canUndo,
  onUndo,
  onReset,
}: HandPanelProps) {
  return (
    <aside className="info-panel" aria-label="対局情報">
      <p>手番: {turn === 'black' ? '先手' : '後手'}</p>
      <p>状態: {resultText}</p>
      <div className="control-row">
        <button type="button" className="control-button" disabled={!canUndo} onClick={onUndo}>
          一手戻す
        </button>
        <button type="button" className="control-button" onClick={onReset}>
          リセット
        </button>
      </div>
      <section aria-label="先手持ち駒">
        <h2>先手持ち駒</h2>
        <ul>{renderHand('black', hands, turn, selectedDropPiece, onSelectDropPiece)}</ul>
      </section>
      <section aria-label="後手持ち駒">
        <h2>後手持ち駒</h2>
        <ul>{renderHand('white', hands, turn, selectedDropPiece, onSelectDropPiece)}</ul>
      </section>
    </aside>
  );
}
