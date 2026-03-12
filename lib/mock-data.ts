export const BOARD_SIZE = 8;

export type PieceColor = "red" | "black";
export type PieceRank = "man" | "king";

export type Piece = {
  id: string;
  color: PieceColor;
  rank: PieceRank;
};

export type BoardCell = Piece | null;
export type BoardState = BoardCell[][];

export type Position = {
  row: number;
  col: number;
};

export type Move = {
  from: Position;
  to: Position;
  captures: Position[];
};

export type GameMode = "single-ai" | "local" | "online" | "puzzle";

export type ThemePreset = {
  id: "minimal" | "dark" | "playful" | "classic";
  label: string;
  description: string;
  palette: {
    boardLight: string;
    boardDark: string;
    boardBorder: string;
    redPiece: string;
    blackPiece: string;
    accent: string;
  };
};

export type CheckersStats = {
  played: number;
  redWins: number;
  blackWins: number;
  draws: number;
  fastestWinSeconds: number | null;
  longestGameSeconds: number | null;
};

export type PuzzleDefinition = {
  id: string;
  title: string;
  objective: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  turn: PieceColor;
  board: BoardState;
};

export const STORAGE_KEYS = {
  gameState: "checkers.game-state.v1",
  stats: "checkers.stats.v1",
  settings: "checkers.settings.v1",
} as const;

export const GAME_MODES: Array<{ id: GameMode; label: string; description: string; enabled: boolean }> = [
  {
    id: "single-ai",
    label: "Single-player vs AI",
    description: "Play against a lightweight built-in bot.",
    enabled: true,
  },
  {
    id: "local",
    label: "Local multiplayer",
    description: "Two players on one device with alternating turns.",
    enabled: true,
  },
  {
    id: "online",
    label: "Online multiplayer",
    description: "Multiplayer-ready shell. Matchmaking can be wired later.",
    enabled: false,
  },
  {
    id: "puzzle",
    label: "Puzzle / challenge mode",
    description: "Solve tactical checkers situations in limited moves.",
    enabled: true,
  },
];

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "minimal",
    label: "Minimalist / clean",
    description: "High contrast and minimal visual noise.",
    palette: {
      boardLight: "#f8fafc",
      boardDark: "#0f172a",
      boardBorder: "#334155",
      redPiece: "#ef4444",
      blackPiece: "#111827",
      accent: "#22d3ee",
    },
  },
  {
    id: "dark",
    label: "Dark / modern",
    description: "Deep tones with neon accents.",
    palette: {
      boardLight: "#374151",
      boardDark: "#111827",
      boardBorder: "#6b7280",
      redPiece: "#f43f5e",
      blackPiece: "#d1d5db",
      accent: "#818cf8",
    },
  },
  {
    id: "playful",
    label: "Playful / colorful",
    description: "Vibrant board with candy-like pieces.",
    palette: {
      boardLight: "#fde68a",
      boardDark: "#f97316",
      boardBorder: "#7c2d12",
      redPiece: "#ec4899",
      blackPiece: "#0369a1",
      accent: "#22c55e",
    },
  },
  {
    id: "classic",
    label: "Classic / wooden",
    description: "Traditional wood board aesthetics.",
    palette: {
      boardLight: "#d6b58a",
      boardDark: "#7b4d2a",
      boardBorder: "#4a2f1a",
      redPiece: "#9f1239",
      blackPiece: "#111827",
      accent: "#f59e0b",
    },
  },
];

export function createEmptyBoard(): BoardState {
  return Array.from({ length: BOARD_SIZE }, () => Array.from({ length: BOARD_SIZE }, () => null));
}

export function isInsideBoard(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function isPlayableSquare(row: number, col: number): boolean {
  return (row + col) % 2 === 1;
}

export function cloneBoard(board: BoardState): BoardState {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

export function createInitialBoard(): BoardState {
  const board = createEmptyBoard();

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (!isPlayableSquare(row, col)) continue;

      if (row <= 2) {
        board[row][col] = {
          id: `black-${row}-${col}`,
          color: "black",
          rank: "man",
        };
      } else if (row >= 5) {
        board[row][col] = {
          id: `red-${row}-${col}`,
          color: "red",
          rank: "man",
        };
      }
    }
  }

  return board;
}

export function countPieces(board: BoardState, color?: PieceColor): number {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (!cell) continue;
      if (!color || cell.color === color) count += 1;
    }
  }
  return count;
}

function directionFor(piece: Piece): number[] {
  if (piece.rank === "king") return [-1, 1];
  return piece.color === "red" ? [-1] : [1];
}

export function getSimpleMoves(board: BoardState, from: Position): Move[] {
  const piece = board[from.row]?.[from.col];
  if (!piece) return [];

  const moves: Move[] = [];
  for (const dRow of directionFor(piece)) {
    for (const dCol of [-1, 1]) {
      const toRow = from.row + dRow;
      const toCol = from.col + dCol;
      if (!isInsideBoard(toRow, toCol)) continue;
      if (board[toRow][toCol] !== null) continue;

      moves.push({
        from,
        to: { row: toRow, col: toCol },
        captures: [],
      });
    }
  }
  return moves;
}

export function getCaptureMoves(board: BoardState, from: Position): Move[] {
  const piece = board[from.row]?.[from.col];
  if (!piece) return [];

  const moves: Move[] = [];

  for (const dRow of directionFor(piece)) {
    for (const dCol of [-1, 1]) {
      const midRow = from.row + dRow;
      const midCol = from.col + dCol;
      const toRow = from.row + dRow * 2;
      const toCol = from.col + dCol * 2;

      if (!isInsideBoard(midRow, midCol) || !isInsideBoard(toRow, toCol)) continue;

      const jumped = board[midRow][midCol];
      if (!jumped || jumped.color === piece.color) continue;
      if (board[toRow][toCol] !== null) continue;

      moves.push({
        from,
        to: { row: toRow, col: toCol },
        captures: [{ row: midRow, col: midCol }],
      });
    }
  }

  return moves;
}

export function getLegalMoves(board: BoardState, turn: PieceColor): Move[] {
  const captures: Move[] = [];
  const simpleMoves: Move[] = [];

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const piece = board[row][col];
      if (!piece || piece.color !== turn) continue;
      const from = { row, col };

      captures.push(...getCaptureMoves(board, from));
      simpleMoves.push(...getSimpleMoves(board, from));
    }
  }

  return captures.length > 0 ? captures : simpleMoves;
}

export function promoteIfNeeded(piece: Piece, row: number): Piece {
  if (piece.rank === "king") return piece;
  if (piece.color === "red" && row === 0) return { ...piece, rank: "king" };
  if (piece.color === "black" && row === BOARD_SIZE - 1) return { ...piece, rank: "king" };
  return piece;
}

export function applyMove(board: BoardState, move: Move): BoardState {
  const next = cloneBoard(board);
  const piece = next[move.from.row][move.from.col];
  if (!piece) return next;

  next[move.from.row][move.from.col] = null;
  for (const cap of move.captures) {
    next[cap.row][cap.col] = null;
  }
  next[move.to.row][move.to.col] = promoteIfNeeded(piece, move.to.row);

  return next;
}

export function evaluateWinner(board: BoardState, turn: PieceColor): PieceColor | "draw" | null {
  const redCount = countPieces(board, "red");
  const blackCount = countPieces(board, "black");

  if (redCount === 0) return "black";
  if (blackCount === 0) return "red";

  const legal = getLegalMoves(board, turn);
  if (legal.length === 0) {
    return turn === "red" ? "black" : "red";
  }

  return null;
}

export function createDefaultStats(): CheckersStats {
  return {
    played: 0,
    redWins: 0,
    blackWins: 0,
    draws: 0,
    fastestWinSeconds: null,
    longestGameSeconds: null,
  };
}

export function updateStats(stats: CheckersStats, winner: PieceColor | "draw", elapsedSeconds: number): CheckersStats {
  const safeElapsed = Number.isFinite(elapsedSeconds) ? Math.max(0, Math.floor(elapsedSeconds)) : 0;

  return {
    played: stats.played + 1,
    redWins: winner === "red" ? stats.redWins + 1 : stats.redWins,
    blackWins: winner === "black" ? stats.blackWins + 1 : stats.blackWins,
    draws: winner === "draw" ? stats.draws + 1 : stats.draws,
    fastestWinSeconds:
      winner === "draw"
        ? stats.fastestWinSeconds
        : stats.fastestWinSeconds === null
          ? safeElapsed
          : Math.min(stats.fastestWinSeconds, safeElapsed),
    longestGameSeconds:
      stats.longestGameSeconds === null
        ? safeElapsed
        : Math.max(stats.longestGameSeconds, safeElapsed),
  };
}

export function formatDuration(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60)
    .toString()
    .padStart(2, "0");
  const secs = (clamped % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

export function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveToStorage<T>(key: string, value: T): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return safeParseJson(raw, fallback);
  } catch {
    return fallback;
  }
}

export function createMockPuzzles(): PuzzleDefinition[] {
  const puzzleOne = createEmptyBoard();
  puzzleOne[5][0] = { id: "red-5-0", color: "red", rank: "man" };
  puzzleOne[4][1] = { id: "black-4-1", color: "black", rank: "man" };
  puzzleOne[2][3] = { id: "black-2-3", color: "black", rank: "man" };
  puzzleOne[6][3] = { id: "red-6-3", color: "red", rank: "king" };

  const puzzleTwo = createEmptyBoard();
  puzzleTwo[1][2] = { id: "black-1-2", color: "black", rank: "king" };
  puzzleTwo[2][1] = { id: "red-2-1", color: "red", rank: "man" };
  puzzleTwo[4][3] = { id: "red-4-3", color: "red", rank: "man" };
  puzzleTwo[6][5] = { id: "red-6-5", color: "red", rank: "king" };

  return [
    {
      id: "puzzle-fork-1",
      title: "Double Jump Fork",
      objective: "Red to move: force a winning capture sequence in 2 moves.",
      difficulty: 3,
      turn: "red",
      board: puzzleOne,
    },
    {
      id: "puzzle-trap-2",
      title: "King Trap",
      objective: "Black to move: trap the red king without losing material.",
      difficulty: 4,
      turn: "black",
      board: puzzleTwo,
    },
  ];
}
