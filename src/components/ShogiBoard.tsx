import { useEffect, useMemo, useState } from 'react';
import { createInitialState } from '../shogi/initialState';
import { cloneGameState, generateLegalMoves, isOwnPiece, tryApplyMove } from '../shogi/legal';
import { getPieceAt, isSameSquare, squareFromIndex } from '../shogi/moveGen';
import { DEFAULT_STORAGE_KEY, loadGameState, saveGameState } from '../shogi/storage';
import type { DropMove, GameMove, GameState, HandPieceType, Move, ShogiBoardProps, Square } from '../shogi/types';
import BoardSquare from './BoardSquare';
import HandPanel from './HandPanel';

const MAX_STATE_HISTORY = 512;

function formatResult(state: GameState): string {
  if (state.result.status === 'playing') {
    return '対局中';
  }
  if (state.result.status === 'repetition') {
    return '千日手';
  }
  return state.result.winner === 'black' ? '先手勝ち（詰み）' : '後手勝ち（詰み）';
}

function chooseMoveWithPromotion(candidates: Move[]): Move {
  const first = candidates[0];
  if (!first) {
    throw new Error('No candidate move for promotion choice');
  }

  if (candidates.length === 1) {
    return first;
  }

  const promoted = candidates.find((move) => move.promote);
  const normal = candidates.find((move) => !move.promote);
  if (!promoted || !normal) {
    return first;
  }

  const shouldPromote = window.confirm('成りますか？');
  return shouldPromote ? promoted : normal;
}

interface MoveTargets {
  selectedMoves: Move[];
  dropMoves: DropMove[];
}

function collectMoveTargets(
  state: GameState,
  selectedSquare: Square | null,
  selectedDropPiece: HandPieceType | null
): MoveTargets {
  const legalMoves = generateLegalMoves(state);
  const selectedMoves = selectedSquare
    ? legalMoves.filter(
        (move): move is Move =>
          move.kind === 'move' && move.from.x === selectedSquare.x && move.from.y === selectedSquare.y
      )
    : [];

  const dropMoves = selectedDropPiece
    ? legalMoves.filter(
        (move): move is DropMove => move.kind === 'drop' && move.pieceType === selectedDropPiece
      )
    : [];

  return { selectedMoves, dropMoves };
}

function getCurrentState(history: GameState[]): GameState {
  const latest = history[history.length - 1];
  if (!latest) {
    throw new Error('State history is empty');
  }
  return latest;
}

function createInitialBoardState(initialState: GameState | undefined, storageKey: string): GameState {
  if (initialState) {
    return cloneGameState(initialState);
  }

  const restored = loadGameState(storageKey);
  if (restored) {
    return cloneGameState(restored);
  }

  return createInitialState();
}

export default function ShogiBoard({
  initialState,
  storageKey = DEFAULT_STORAGE_KEY,
  onMove,
  onResult,
}: ShogiBoardProps) {
  const [resetBaseState] = useState<GameState>(() => cloneGameState(initialState ?? createInitialState()));
  const [stateHistory, setStateHistory] = useState<GameState[]>(() => [
    createInitialBoardState(initialState, storageKey),
  ]);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [selectedDropPiece, setSelectedDropPiece] = useState<HandPieceType | null>(null);
  const state = getCurrentState(stateHistory);

  useEffect(() => {
    saveGameState(state, storageKey);
  }, [state, storageKey]);

  const { selectedMoves, dropMoves } = useMemo(
    () => collectMoveTargets(state, selectedSquare, selectedDropPiece),
    [state, selectedSquare, selectedDropPiece]
  );

  const clearSelections = (): void => {
    setSelectedSquare(null);
    setSelectedDropPiece(null);
  };

  const applyChosenMove = (move: GameMove): void => {
    const nextState = tryApplyMove(state, move);
    if (!nextState) {
      return;
    }

    setStateHistory((previous) => {
      const next = [...previous, nextState];
      // Keep history bounded so long sessions do not grow memory without limit.
      if (next.length > MAX_STATE_HISTORY) {
        next.shift();
      }
      return next;
    });
    clearSelections();

    const record = nextState.history[nextState.history.length - 1];
    if (record) {
      onMove?.(record);
    }
    onResult?.(nextState.result);
  };

  const onUndo = (): void => {
    setStateHistory((previous) => {
      if (previous.length <= 1) {
        return previous;
      }
      return previous.slice(0, -1);
    });
    clearSelections();
  };

  const onReset = (): void => {
    const nextState = cloneGameState(resetBaseState);
    setStateHistory([nextState]);
    clearSelections();
    onResult?.(nextState.result);
  };

  const onSquareClick = (square: Square): void => {
    if (state.result.status !== 'playing') {
      return;
    }

    if (selectedDropPiece) {
      const drop = dropMoves.find((move) => isSameSquare(move.to, square));
      if (drop) {
        applyChosenMove(drop);
        return;
      }

      if (isOwnPiece(state, state.turn, square)) {
        setSelectedDropPiece(null);
        setSelectedSquare(square);
      }
      return;
    }

    if (selectedSquare && isSameSquare(selectedSquare, square)) {
      setSelectedSquare(null);
      return;
    }

    if (selectedSquare) {
      const candidates = selectedMoves.filter((move) => isSameSquare(move.to, square));
      if (candidates.length > 0) {
        const chosenMove = chooseMoveWithPromotion(candidates);
        applyChosenMove(chosenMove);
        return;
      }
    }

    if (isOwnPiece(state, state.turn, square)) {
      setSelectedSquare(square);
      return;
    }

    setSelectedSquare(null);
  };

  const legalTargetIndices = new Set([
    ...selectedMoves.map((move) => `${move.to.x}-${move.to.y}`),
    ...dropMoves.map((move) => `${move.to.x}-${move.to.y}`),
  ]);

  return (
    <section className="board-layout" aria-label="将棋盤">
      <div className="board" role="grid" aria-label="9x9将棋盤">
        {state.board.map((_, index) => {
          const square = squareFromIndex(index);
          const piece = getPieceAt(state, square);
          return (
            <BoardSquare
              key={`${square.x}-${square.y}`}
              square={square}
              piece={piece}
              selected={Boolean(selectedSquare && isSameSquare(square, selectedSquare))}
              legalTarget={legalTargetIndices.has(`${square.x}-${square.y}`)}
              onClick={onSquareClick}
            />
          );
        })}
      </div>
      <HandPanel
        hands={state.hands}
        turn={state.turn}
        resultText={formatResult(state)}
        selectedDropPiece={selectedDropPiece}
        canUndo={stateHistory.length > 1}
        onUndo={onUndo}
        onReset={onReset}
        onSelectDropPiece={(pieceType) => {
          setSelectedSquare(null);
          setSelectedDropPiece(pieceType);
        }}
      />
    </section>
  );
}
