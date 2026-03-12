export type PlayerColor = "red" | "black";

export interface CheckerPiece {
  id: string;
  color: PlayerColor;
  king: boolean;
}

export type Cell = CheckerPiece | null;
export type Board = Cell[][];

export interface Move {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  captured?: { row: number; col: number };
}

export interface AppliedMoveResult {
  board: Board;
  promoted: boolean;
  captured: boolean;
  nextTurn: PlayerColor;
}

export interface GameState {
  board: Board;
  currentTurn: PlayerColor;
  selected: { row: number; col: number } | null;
  validMoves: Move[];
  moveHistory: Move[];
  redoStack: Move[];
  winner: PlayerColor | "draw" | null;
  startedAt: number;
  elapsedSeconds: number;
  mode: string;
  theme: string;
}

export interface GameStats {
  totalGames: number;
  redWins: number;
  blackWins: number;
  draws: number;
  longestWinStreak: number;
  currentWinStreak: number;
  averageGameDurationSeconds: number;
}

export interface ThemeOption {
  id: string;
  name: string;
  boardClass: string;
  pieceRedClass: string;
  pieceBlackClass: string;
}

export interface ModeOption {
  id: string;
  name: string;
  description: string;
}

export interface PuzzleChallenge {
  id: string;
  title: string;
  goal: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
}

export const BOARD_SIZE = 8;
export const STORAGE_KEY = "checkers.autosave.v1";

export const MODE_OPTIONS: ModeOption[] = [
  {
    id: "single-ai",
    name: "Single-player vs AI",
    description: "Practice against a local AI using weighted random move selection.",
  },
  {
    id: "local-mp",
    name: "Local multiplayer",
    description: "Two players on one device. Great for quick couch matches.",
  },
  {
    id: "online-mp",
    name: "Online multiplayer (coming soon)",
    description: "Plumbing-ready mode for future real-time sessions.",
  },
  {
    id: "puzzle",
    name: "Puzzle / challenge mode",
    description: "Solve tactical board setups with limited moves.",
  },
];

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "dark-modern",
    name: "Dark / Modern",
    boardClass: "from-slate-900 to-zinc-900",
    pieceRedClass: "from-rose-500 to-rose-700",
    pieceBlackClass: "from-slate-300 to-slate-500",
  },
  {
    id: "playful-colorful",
    name: "Playful / Colorful",
    boardClass: "from-fuchsia-900 to-indigo-900",
    pieceRedClass: "from-orange-400 to-pink-600",
    pieceBlackClass: "from-cyan-300 to-blue-500",
  },
  {
    id: "classic-wood",
    name: "Classic / Wooden",
    boardClass: "from-amber-900 to-yellow-950",
    pieceRedClass: "from-red-700 to-red-900",
    pieceBlackClass: "from-stone-500 to-stone-700",
  },
];

export const MOCK_PUZZLES: PuzzleChallenge[] = [
  { id: "pz-1", title: "Fork Trap", goal: "Force a double capture in 2 moves.", difficulty: 2 },
  { id: "pz-2", title: "Last Defender", goal: "Promote to king without losing material.", difficulty: 3 },
  { id: "pz-3", title: "King Hunt", goal: "Capture the enemy king in 3 turns.", difficulty: 4 },
  { id: "pz-4", title: "Escape Route", goal: "Avoid capture and draw the position.", difficulty: 5 },
];

export const DEFAULT_STATS: GameStats = {
  totalGames: 0,
  redWins: 0,
  blackWins: 0,
  draws: 0,
  longestWinStreak: 0,
  currentWinStreak: 0,
  averageGameDurationSeconds: 0,
};

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

export function createStartingBoard(): Board {
  const board: Board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  );

  let blackCount = 1;
  let redCount = 1;

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const isDarkSquare = (row + col) % 2 === 1;
      if (!isDarkSquare) continue;

      if (row < 3) {
        board[row][col] = { id: `b-${blackCount++}`, color: "black", king: false };
      } else if (row > 4) {
        board[row][col] = { id: `r-${redCount++}`, color: "red", king: false };
      }
    }
  }

  return board;
}

export const INITIAL_BOARD = createStartingBoard();
export const initialBoard = INITIAL_BOARD;

export function isInBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function movementDirections(piece: CheckerPiece): Array<{ dr: number; dc: number }> {
  if (piece.king) {
    return [
      { dr: -1, dc: -1 },
      { dr: -1, dc: 1 },
      { dr: 1, dc: -1 },
      { dr: 1, dc: 1 },
    ];
  }

  return piece.color === "red"
    ? [
        { dr: -1, dc: -1 },
        { dr: -1, dc: 1 },
      ]
    : [
        { dr: 1, dc: -1 },
        { dr: 1, dc: 1 },
      ];
}

export function getSimpleMovesForPiece(board: Board, row: number, col: number): Move[] {
  const piece = board[row]?.[col];
  if (!piece) return [];

  const moves: Move[] = [];

  for (const { dr, dc } of movementDirections(piece)) {
    const toRow = row + dr;
    const toCol = col + dc;

    if (isInBounds(toRow, toCol) && board[toRow][toCol] === null) {
      moves.push({ fromRow: row, fromCol: col, toRow, toCol });
    }
  }

  return moves;
}

export function getCaptureMovesForPiece(board: Board, row: number, col: number): Move[] {
  const piece = board[row]?.[col];
  if (!piece) return [];

  const captures: Move[] = [];

  for (const { dr, dc } of movementDirections(piece)) {
    const enemyRow = row + dr;
    const enemyCol = col + dc;
    const landRow = row + dr * 2;
    const landCol = col + dc * 2;

    if (!isInBounds(enemyRow, enemyCol) || !isInBounds(landRow, landCol)) continue;

    const enemy = board[enemyRow][enemyCol];
    const landing = board[landRow][landCol];

    if (enemy && enemy.color !== piece.color && landing === null) {
      captures.push({
        fromRow: row,
        fromCol: col,
        toRow: landRow,
        toCol: landCol,
        captured: { row: enemyRow, col: enemyCol },
      });
    }
  }

  return captures;
}

export function getValidMovesForPiece(board: Board, row: number, col: number): Move[] {
  const captures = getCaptureMovesForPiece(board, row, col);
  return captures.length > 0 ? captures : getSimpleMovesForPiece(board, row, col);
}

export function getAllValidMoves(board: Board, player: PlayerColor): Move[] {
  const captures: Move[] = [];
  const simpleMoves: Move[] = [];

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const piece = board[row][col];
      if (!piece || piece.color !== player) continue;

      const pieceCaptures = getCaptureMovesForPiece(board, row, col);
      if (pieceCaptures.length > 0) {
        captures.push(...pieceCaptures);
      } else {
        simpleMoves.push(...getSimpleMovesForPiece(board, row, col));
      }
    }
  }

  return captures.length > 0 ? captures : simpleMoves;
}

export function applyMove(board: Board, move: Move, turn: PlayerColor): AppliedMoveResult {
  const nextBoard = cloneBoard(board);
  const piece = nextBoard[move.fromRow][move.fromCol];

  if (!piece) {
    throw new Error("Invalid move: source square is empty.");
  }

  nextBoard[move.fromRow][move.fromCol] = null;

  if (move.captured) {
    nextBoard[move.captured.row][move.captured.col] = null;
  }

  const promoted =
    (piece.color === "red" && move.toRow === 0) ||
    (piece.color === "black" && move.toRow === BOARD_SIZE - 1);

  nextBoard[move.toRow][move.toCol] = { ...piece, king: piece.king || promoted };

  return {
    board: nextBoard,
    promoted,
    captured: Boolean(move.captured),
    nextTurn: turn === "red" ? "black" : "red",
  };
}

export function countPieces(board: Board): { red: number; black: number; redKings: number; blackKings: number } {
  const tally = { red: 0, black: 0, redKings: 0, blackKings: 0 };

  for (const row of board) {
    for (const cell of row) {
      if (!cell) continue;
      if (cell.color === "red") {
        tally.red += 1;
        if (cell.king) tally.redKings += 1;
      } else {
        tally.black += 1;
        if (cell.king) tally.blackKings += 1;
      }
    }
  }

  return tally;
}

export function determineWinner(board: Board, currentTurn: PlayerColor): PlayerColor | "draw" | null {
  const pieces = countPieces(board);

  if (pieces.red === 0 && pieces.black === 0) return "draw";
  if (pieces.red === 0) return "black";
  if (pieces.black === 0) return "red";

  const moves = getAllValidMoves(board, currentTurn);
  if (moves.length === 0) {
    return currentTurn === "red" ? "black" : "red";
  }

  return null;
}

export function createInitialGameState(
  mode = MODE_OPTIONS[0]?.id ?? "single-ai",
  theme = THEME_OPTIONS[0]?.id ?? "dark-modern",
): GameState {
  return {
    board: createStartingBoard(),
    currentTurn: "red",
    selected: null,
    validMoves: [],
    moveHistory: [],
    redoStack: [],
    winner: null,
    startedAt: Date.now(),
    elapsedSeconds: 0,
    mode,
    theme,
  };
}

export function formatSeconds(total: number): string {
  const safe = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function getRandomHint(board: Board, player: PlayerColor): Move | null {
  const moves = getAllValidMoves(board, player);
  if (moves.length === 0) return null;

  const captureMoves = moves.filter((m) => Boolean(m.captured));
  const source = captureMoves.length > 0 ? captureMoves : moves;
  return source[Math.floor(Math.random() * source.length)] ?? null;
}

export function saveGameState(state: GameState): boolean {
  if (typeof window === "undefined") return false;

  try {
    const payload = JSON.stringify(state);
    window.localStorage.setItem(STORAGE_KEY, payload);
    return true;
  } catch {
    return false;
  }
}

export function loadGameState(): GameState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<GameState>;
    if (!parsed || !Array.isArray(parsed.board) || !parsed.currentTurn) return null;

    const fallback = createInitialGameState(
      typeof parsed.mode === "string" ? parsed.mode : undefined,
      typeof parsed.theme === "string" ? parsed.theme : undefined,
    );

    return {
      ...fallback,
      ...parsed,
      board: parsed.board as Board,
      currentTurn: parsed.currentTurn as PlayerColor,
      moveHistory: Array.isArray(parsed.moveHistory) ? parsed.moveHistory : [],
      redoStack: Array.isArray(parsed.redoStack) ? parsed.redoStack : [],
      validMoves: Array.isArray(parsed.validMoves) ? parsed.validMoves : [],
      selected: parsed.selected ?? null,
      winner: parsed.winner ?? null,
      startedAt: typeof parsed.startedAt === "number" ? parsed.startedAt : Date.now(),
      elapsedSeconds: typeof parsed.elapsedSeconds === "number" ? parsed.elapsedSeconds : 0,
    };
  } catch {
    return null;
  }
}

export function clearSavedGameState(): boolean {
  if (typeof window === "undefined") return false;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export const mockData = {
  modeOptions: MODE_OPTIONS,
  themeOptions: THEME_OPTIONS,
  puzzles: MOCK_PUZZLES,
  defaultStats: DEFAULT_STATS,
};

export default mockData;
