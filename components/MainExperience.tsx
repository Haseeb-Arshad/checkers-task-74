"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Player = "red" | "black";
type GameMode = "local" | "ai" | "online" | "puzzle";
type ThemeName = "minimal" | "dark" | "playful" | "classic" | "custom";
type OnlineStatus = "idle" | "matching" | "connected" | "reconnecting";

type Piece = {
  player: Player;
  king: boolean;
};

type Cell = Piece | null;
type Board = Cell[][];

type Position = {
  row: number;
  col: number;
};

type Move = {
  from: Position;
  to: Position;
  captures: Position[];
};

type Snapshot = {
  board: Board;
  currentPlayer: Player;
  forcedFrom: Position | null;
  winner: Player | "draw" | null;
  moveCount: number;
  timers: { red: number; black: number };
  mode: GameMode;
  puzzleIndex: number;
  puzzleMovesLeft: number;
};

type Stats = {
  gamesPlayed: number;
  redWins: number;
  blackWins: number;
  draws: number;
  completedByMode: Record<GameMode, number>;
};

type ThemePalette = {
  appBg: string;
  appText: string;
  boardLight: string;
  boardDark: string;
  panel: string;
  panelBorder: string;
  redPiece: string;
  blackPiece: string;
  accent: string;
};

type PuzzleDef = {
  id: string;
  name: string;
  description: string;
  startingPlayer: Player;
  moveLimit: number;
  board: Board;
};

const BOARD_SIZE = 8;
const START_TIME_SECONDS = 5 * 60;
const STATS_KEY = "checkers.fun.stats.v1";
const SAVE_KEY = "checkers.fun.save.v1";

const defaultStats: Stats = {
  gamesPlayed: 0,
  redWins: 0,
  blackWins: 0,
  draws: 0,
  completedByMode: {
    local: 0,
    ai: 0,
    online: 0,
    puzzle: 0,
  },
};

const THEMES: Record<Exclude<ThemeName, "custom">, ThemePalette> = {
  minimal: {
    appBg: "#f5f7fb",
    appText: "#111827",
    boardLight: "#e5e7eb",
    boardDark: "#9ca3af",
    panel: "#ffffff",
    panelBorder: "#d1d5db",
    redPiece: "#ef4444",
    blackPiece: "#111827",
    accent: "#2563eb",
  },
  dark: {
    appBg: "#080b16",
    appText: "#e5e7eb",
    boardLight: "#1f2937",
    boardDark: "#0f172a",
    panel: "#0b1225",
    panelBorder: "#243043",
    redPiece: "#fb7185",
    blackPiece: "#d1d5db",
    accent: "#38bdf8",
  },
  playful: {
    appBg: "#0f172a",
    appText: "#f8fafc",
    boardLight: "#60a5fa",
    boardDark: "#7c3aed",
    panel: "#1e1b4b",
    panelBorder: "#8b5cf6",
    redPiece: "#f97316",
    blackPiece: "#34d399",
    accent: "#facc15",
  },
  classic: {
    appBg: "#2d1f10",
    appText: "#fff8e6",
    boardLight: "#d6b48a",
    boardDark: "#8b5e34",
    panel: "#3b2a18",
    panelBorder: "#6f4d2e",
    redPiece: "#b91c1c",
    blackPiece: "#111111",
    accent: "#f59e0b",
  },
};

const parseBoard = (rows: string[]): Board =>
  rows.map((row, rowIndex) =>
    row.split("").map((char, colIndex) => {
      if (!isDarkSquare(rowIndex, colIndex)) return null;
      if (char === "r") return { player: "red", king: false };
      if (char === "R") return { player: "red", king: true };
      if (char === "b") return { player: "black", king: false };
      if (char === "B") return { player: "black", king: true };
      return null;
    })
  );

const PUZZLES: PuzzleDef[] = [
  {
    id: "fork-1",
    name: "Fork Finish",
    description: "Red to move. Force a double capture and finish within 2 turns.",
    startingPlayer: "red",
    moveLimit: 2,
    board: parseBoard([
      "........",
      "....b...",
      "...b....",
      "..r.....",
      "........",
      ".....r..",
      "........",
      "........",
    ]),
  },
  {
    id: "king-hunt",
    name: "King Hunt",
    description: "Convert to a king and clear black in 3 moves.",
    startingPlayer: "red",
    moveLimit: 3,
    board: parseBoard([
      "........",
      "......b.",
      "........",
      "....b...",
      "...r....",
      "........",
      "........",
      "........",
    ]),
  },
  {
    id: "endgame-net",
    name: "Endgame Net",
    description: "Trap black with precise movement in 4 turns.",
    startingPlayer: "red",
    moveLimit: 4,
    board: parseBoard([
      "........",
      "..b.....",
      "........",
      "....r...",
      "........",
      "......r.",
      "........",
      "........",
    ]),
  },
];

function isDarkSquare(row: number, col: number) {
  return (row + col) % 2 === 1;
}

function inBounds(row: number, col: number) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function createInitialBoard(): Board {
  const board: Board = Array.from({ length: BOARD_SIZE }, () => Array<Cell>(BOARD_SIZE).fill(null));

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (isDarkSquare(row, col)) {
        board[row][col] = { player: "black", king: false };
      }
    }
  }

  for (let row = 5; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (isDarkSquare(row, col)) {
        board[row][col] = { player: "red", king: false };
      }
    }
  }

  return board;
}

function getDirections(piece: Piece): Array<[number, number]> {
  if (piece.king) {
    return [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ];
  }
  const forward = piece.player === "red" ? -1 : 1;
  return [
    [forward, -1],
    [forward, 1],
  ];
}

function getCaptureMovesForPiece(board: Board, row: number, col: number, piece: Piece): Move[] {
  const moves: Move[] = [];

  for (const [dr, dc] of getDirections(piece)) {
    const midRow = row + dr;
    const midCol = col + dc;
    const landRow = row + dr * 2;
    const landCol = col + dc * 2;

    if (!inBounds(midRow, midCol) || !inBounds(landRow, landCol)) continue;

    const middle = board[midRow][midCol];
    const landing = board[landRow][landCol];

    if (middle && middle.player !== piece.player && !landing) {
      moves.push({
        from: { row, col },
        to: { row: landRow, col: landCol },
        captures: [{ row: midRow, col: midCol }],
      });
    }
  }

  return moves;
}

function getSimpleMovesForPiece(board: Board, row: number, col: number, piece: Piece): Move[] {
  const moves: Move[] = [];

  for (const [dr, dc] of getDirections(piece)) {
    const toRow = row + dr;
    const toCol = col + dc;
    if (!inBounds(toRow, toCol)) continue;
    if (board[toRow][toCol]) continue;

    moves.push({
      from: { row, col },
      to: { row: toRow, col: toCol },
      captures: [],
    });
  }

  return moves;
}

function getLegalMoves(board: Board, player: Player, forcedFrom: Position | null): Move[] {
  if (forcedFrom) {
    const forcedPiece = board[forcedFrom.row][forcedFrom.col];
    if (!forcedPiece || forcedPiece.player !== player) return [];
    return getCaptureMovesForPiece(board, forcedFrom.row, forcedFrom.col, forcedPiece);
  }

  const captures: Move[] = [];
  const simple: Move[] = [];

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const piece = board[row][col];
      if (!piece || piece.player !== player) continue;

      const pieceCaptures = getCaptureMovesForPiece(board, row, col, piece);
      if (pieceCaptures.length > 0) {
        captures.push(...pieceCaptures);
      } else {
        simple.push(...getSimpleMovesForPiece(board, row, col, piece));
      }
    }
  }

  return captures.length > 0 ? captures : simple;
}

function applyMove(board: Board, move: Move): { board: Board; promoted: boolean } {
  const next = cloneBoard(board);
  const movingPiece = next[move.from.row][move.from.col];

  if (!movingPiece) {
    return { board: next, promoted: false };
  }

  next[move.from.row][move.from.col] = null;
  for (const capture of move.captures) {
    next[capture.row][capture.col] = null;
  }

  const shouldPromote =
    !movingPiece.king &&
    ((movingPiece.player === "red" && move.to.row === 0) ||
      (movingPiece.player === "black" && move.to.row === BOARD_SIZE - 1));

  next[move.to.row][move.to.col] = {
    player: movingPiece.player,
    king: movingPiece.king || shouldPromote,
  };

  return { board: next, promoted: shouldPromote };
}

function countPieces(board: Board, player: Player): number {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell?.player === player) count += 1;
    }
  }
  return count;
}

function evaluateWinner(board: Board, playerToMove: Player, forcedFrom: Position | null): Player | null {
  if (countPieces(board, "red") === 0) return "black";
  if (countPieces(board, "black") === 0) return "red";

  const moves = getLegalMoves(board, playerToMove, forcedFrom);
  if (moves.length === 0) return playerToMove === "red" ? "black" : "red";

  return null;
}

function samePos(a: Position, b: Position) {
  return a.row === b.row && a.col === b.col;
}

function formatTime(value: number): string {
  const clamped = Math.max(0, value);
  const min = Math.floor(clamped / 60)
    .toString()
    .padStart(2, "0");
  const sec = Math.floor(clamped % 60)
    .toString()
    .padStart(2, "0");
  return `${min}:${sec}`;
}

function getHintMove(moves: Move[], board: Board, player: Player): Move | null {
  if (moves.length === 0) return null;

  const scored = moves.map((move) => {
    const piece = board[move.from.row][move.from.col];
    const captureScore = move.captures.length * 10;
    const promotionScore =
      piece && !piece.king && ((player === "red" && move.to.row === 0) || (player === "black" && move.to.row === 7))
        ? 8
        : 0;
    const centerScore = 3 - Math.abs(3.5 - move.to.col);
    return { move, score: captureScore + promotionScore + centerScore };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.move ?? null;
}

function capitalize(player: Player) {
  return player.charAt(0).toUpperCase() + player.slice(1);
}

export default function MainExperience() {
  const [mode, setMode] = useState<GameMode>("local");
  const [theme, setTheme] = useState<ThemeName>("dark");
  const [customTheme, setCustomTheme] = useState<ThemePalette>({
    appBg: "#09111f",
    appText: "#e5e7eb",
    boardLight: "#dbeafe",
    boardDark: "#3b82f6",
    panel: "#111827",
    panelBorder: "#1f2937",
    redPiece: "#f43f5e",
    blackPiece: "#111827",
    accent: "#22d3ee",
  });

  const [board, setBoard] = useState<Board>(createInitialBoard());
  const [currentPlayer, setCurrentPlayer] = useState<Player>("red");
  const [selected, setSelected] = useState<Position | null>(null);
  const [forcedFrom, setForcedFrom] = useState<Position | null>(null);
  const [winner, setWinner] = useState<Player | "draw" | null>(null);
  const [message, setMessage] = useState("Red starts. Capture is mandatory!");
  const [moveCount, setMoveCount] = useState(0);

  const [history, setHistory] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);

  const [timers, setTimers] = useState({ red: START_TIME_SECONDS, black: START_TIME_SECONDS });
  const [paused, setPaused] = useState(false);

  const [hintsOn, setHintsOn] = useState(true);
  const [hintMove, setHintMove] = useState<Move | null>(null);
  const [showCoords, setShowCoords] = useState(false);

  const [stats, setStats] = useState<Stats>(defaultStats);

  const [aiThinking, setAiThinking] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState<OnlineStatus>("idle");
  const [remoteThinking, setRemoteThinking] = useState(false);

  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [puzzleMovesLeft, setPuzzleMovesLeft] = useState(0);

  const palette = useMemo<ThemePalette>(() => {
    if (theme === "custom") return customTheme;
    return THEMES[theme];
  }, [theme, customTheme]);

  const legalMoves = useMemo(() => getLegalMoves(board, currentPlayer, forcedFrom), [board, currentPlayer, forcedFrom]);

  const selectedMoves = useMemo(() => {
    if (!selected) return [] as Move[];
    return legalMoves.filter((move) => samePos(move.from, selected));
  }, [legalMoves, selected]);

  const playerCanInteract = useMemo(() => {
    if (winner || paused) return false;
    if (mode === "ai" && currentPlayer === "black") return false;
    if (mode === "online") {
      if (onlineStatus !== "connected") return false;
      if (currentPlayer === "black") return false;
    }
    return true;
  }, [winner, paused, mode, currentPlayer, onlineStatus]);

  const registerResult = useCallback(
    (result: Player | "draw") => {
      setStats((prev) => ({
        gamesPlayed: prev.gamesPlayed + 1,
        redWins: prev.redWins + (result === "red" ? 1 : 0),
        blackWins: prev.blackWins + (result === "black" ? 1 : 0),
        draws: prev.draws + (result === "draw" ? 1 : 0),
        completedByMode: {
          ...prev.completedByMode,
          [mode]: prev.completedByMode[mode] + 1,
        },
      }));
    },
    [mode]
  );

  const makeSnapshot = useCallback((): Snapshot => {
    return {
      board: cloneBoard(board),
      currentPlayer,
      forcedFrom: forcedFrom ? { ...forcedFrom } : null,
      winner,
      moveCount,
      timers: { ...timers },
      mode,
      puzzleIndex,
      puzzleMovesLeft,
    };
  }, [board, currentPlayer, forcedFrom, winner, moveCount, timers, mode, puzzleIndex, puzzleMovesLeft]);

  const restoreSnapshot = useCallback((snap: Snapshot) => {
    setBoard(cloneBoard(snap.board));
    setCurrentPlayer(snap.currentPlayer);
    setForcedFrom(snap.forcedFrom ? { ...snap.forcedFrom } : null);
    setWinner(snap.winner);
    setMoveCount(snap.moveCount);
    setTimers({ ...snap.timers });
    setMode(snap.mode);
    setPuzzleIndex(snap.puzzleIndex);
    setPuzzleMovesLeft(snap.puzzleMovesLeft);
    setSelected(null);
    setHintMove(null);
    setMessage("Game state restored.");
  }, []);

  const startNewGame = useCallback(
    (nextMode: GameMode = mode) => {
      setHistory([]);
      setFuture([]);
      setWinner(null);
      setSelected(null);
      setForcedFrom(null);
      setMoveCount(0);
      setHintMove(null);
      setPaused(false);
      setTimers({ red: START_TIME_SECONDS, black: START_TIME_SECONDS });
      setAiThinking(false);
      setRemoteThinking(false);

      if (nextMode === "puzzle") {
        const puzzle = PUZZLES[puzzleIndex];
        setBoard(cloneBoard(puzzle.board));
        setCurrentPlayer(puzzle.startingPlayer);
        setPuzzleMovesLeft(puzzle.moveLimit);
        setMessage(`${puzzle.name}: ${puzzle.description}`);
      } else {
        setBoard(createInitialBoard());
        setCurrentPlayer("red");
        setPuzzleMovesLeft(0);
        if (nextMode === "local") setMessage("Local multiplayer: pass device each turn.");
        if (nextMode === "ai") setMessage("Single-player: you are Red, AI is Black.");
        if (nextMode === "online") setMessage("Matchmaking started...");
      }

      if (nextMode === "online") {
        setOnlineStatus("matching");
        window.setTimeout(() => {
          setOnlineStatus("connected");
          setMessage("Connected! You are Red. Opponent is synced.");
        }, 1100);
      } else {
        setOnlineStatus("idle");
      }
    },
    [mode, puzzleIndex]
  );

  const executeMove = useCallback(
    (move: Move) => {
      const snapshot = makeSnapshot();
      setHistory((prev) => [...prev, snapshot]);
      setFuture([]);

      const result = applyMove(board, move);
      let nextPlayer: Player = currentPlayer;
      let nextForcedFrom: Position | null = null;
      let chainCapture = false;

      const movedPiece = result.board[move.to.row][move.to.col];
      if (move.captures.length > 0 && movedPiece && !result.promoted) {
        const followUps = getCaptureMovesForPiece(result.board, move.to.row, move.to.col, movedPiece);
        if (followUps.length > 0) {
          chainCapture = true;
          nextForcedFrom = { ...move.to };
          setMessage("Combo move! Continue with the same piece.");
        }
      }

      if (!chainCapture) {
        nextPlayer = currentPlayer === "red" ? "black" : "red";
      }

      setBoard(result.board);
      setForcedFrom(nextForcedFrom);
      setCurrentPlayer(nextPlayer);
      setSelected(chainCapture ? { ...move.to } : null);
      setMoveCount((prev) => prev + 1);

      const gameWinner = evaluateWinner(result.board, nextPlayer, nextForcedFrom);

      if (mode === "puzzle") {
        const nextRemaining = Math.max(0, puzzleMovesLeft - 1);
        setPuzzleMovesLeft(nextRemaining);

        if (gameWinner === "red") {
          setWinner("red");
          setMessage("Puzzle solved! Brilliant finish.");
          registerResult("red");
          return;
        }

        if (nextRemaining === 0 && !gameWinner) {
          setWinner("black");
          setMessage("Puzzle failed: move limit reached.");
          registerResult("black");
          return;
        }
      }

      if (gameWinner) {
        setWinner(gameWinner);
        setMessage(`${capitalize(gameWinner)} wins!`);
        registerResult(gameWinner);
      } else if (!chainCapture) {
        setMessage(`${capitalize(nextPlayer)} to move.`);
      }
    },
    [board, currentPlayer, makeSnapshot, mode, puzzleMovesLeft, registerResult]
  );

  useEffect(() => {
    if (!hintsOn || winner) {
      setHintMove(null);
      return;
    }
    setHintMove(getHintMove(legalMoves, board, currentPlayer));
  }, [hintsOn, legalMoves, board, currentPlayer, winner]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STATS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Stats;
        setStats(parsed);
      }
    } catch {
      // Ignore invalid persisted values
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch {
      // Ignore write failures
    }
  }, [stats]);

  useEffect(() => {
    if (paused || winner) return;
    if (mode === "online" && onlineStatus !== "connected") return;

    const id = window.setInterval(() => {
      setTimers((prev) => {
        const key = currentPlayer;
        const next = Math.max(0, prev[key] - 1);

        if (next === 0) {
          const timeoutWinner: Player = key === "red" ? "black" : "red";
          setWinner(timeoutWinner);
          setMessage(`${capitalize(timeoutWinner)} wins on time!`);
          registerResult(timeoutWinner);
        }

        return { ...prev, [key]: next };
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [paused, winner, currentPlayer, mode, onlineStatus, registerResult]);

  useEffect(() => {
    if (mode !== "ai" || winner || currentPlayer !== "black") return;

    setAiThinking(true);
    const id = window.setTimeout(() => {
      const aiMoves = getLegalMoves(board, "black", forcedFrom);
      if (aiMoves.length === 0) {
        setWinner("red");
        setMessage("Red wins. AI has no legal moves.");
        registerResult("red");
      } else {
        const best = getHintMove(aiMoves, board, "black") ?? aiMoves[0];
        executeMove(best);
      }
      setAiThinking(false);
    }, 650);

    return () => window.clearTimeout(id);
  }, [mode, winner, currentPlayer, board, forcedFrom, executeMove, registerResult]);

  useEffect(() => {
    if (mode !== "online" || winner || currentPlayer !== "black" || onlineStatus !== "connected") return;

    setRemoteThinking(true);
    const id = window.setTimeout(() => {
      const unstable = Math.random() < 0.18;

      const runMove = () => {
        const remoteMoves = getLegalMoves(board, "black", forcedFrom);
        if (remoteMoves.length === 0) {
          setWinner("red");
          setMessage("You win! Opponent has no legal moves.");
          registerResult("red");
          setRemoteThinking(false);
          return;
        }

        const pick = getHintMove(remoteMoves, board, "black") ?? remoteMoves[0];
        executeMove(pick);
        setRemoteThinking(false);
      };

      if (unstable) {
        setOnlineStatus("reconnecting");
        setMessage("Network hiccup... reconnecting opponent.");
        window.setTimeout(() => {
          setOnlineStatus("connected");
          setMessage("Reconnected. Opponent move incoming.");
          runMove();
        }, 900);
      } else {
        runMove();
      }
    }, 950);

    return () => window.clearTimeout(id);
  }, [mode, winner, currentPlayer, onlineStatus, board, forcedFrom, executeMove, registerResult]);

  const onSelectMode = (nextMode: GameMode) => {
    setMode(nextMode);
    startNewGame(nextMode);
  };

  const onSquareClick = (row: number, col: number) => {
    if (!playerCanInteract) return;
    if (!isDarkSquare(row, col)) return;

    const clicked = board[row][col];

    if (selected) {
      const move = selectedMoves.find((candidate) => candidate.to.row === row && candidate.to.col === col);
      if (move) {
        executeMove(move);
        return;
      }
    }

    if (clicked && clicked.player === currentPlayer) {
      const movable = legalMoves.some((move) => move.from.row === row && move.from.col === col);
      if (movable) {
        setSelected({ row, col });
        setMessage(`${capitalize(currentPlayer)} selected a ${clicked.king ? "king" : "piece"}.`);
        return;
      }
    }

    setSelected(null);
  };

  const undo = () => {
    if (history.length === 0 || aiThinking || remoteThinking) return;
    const prev = [...history];
    const last = prev.pop();
    if (!last) return;

    setFuture((f) => [makeSnapshot(), ...f]);
    setHistory(prev);
    restoreSnapshot(last);
  };

  const redo = () => {
    if (future.length === 0 || aiThinking || remoteThinking) return;
    const next = [...future];
    const first = next.shift();
    if (!first) return;

    setHistory((h) => [...h, makeSnapshot()]);
    setFuture(next);
    restoreSnapshot(first);
  };

  const saveGame = () => {
    try {
      const payload = makeSnapshot();
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      setMessage("Game saved locally. You can load it anytime.");
    } catch {
      setMessage("Save failed. Browser storage may be unavailable.");
    }
  };

  const loadGame = () => {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) {
        setMessage("No saved game found.");
        return;
      }
      const parsed = JSON.parse(raw) as Snapshot;
      restoreSnapshot(parsed);
      setOnlineStatus(parsed.mode === "online" ? "connected" : "idle");
    } catch {
      setMessage("Load failed. Saved state is invalid.");
    }
  };

  const redPieces = countPieces(board, "red");
  const blackPieces = countPieces(board, "black");

  return (
    <section
      className="min-h-screen px-4 py-6 md:px-8"
      style={{ backgroundColor: palette.appBg, color: palette.appText }}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-2xl border p-5 shadow-xl" style={{ backgroundColor: palette.panel, borderColor: palette.panelBorder }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Fun Checkers Arena</h1>
              <p className="mt-1 text-sm opacity-90">
                Single-player AI, local multiplayer, online-style matchmaking, and puzzle challenges in one board.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs md:text-sm">
              {(["local", "ai", "online", "puzzle"] as GameMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => onSelectMode(m)}
                  className={`rounded-full border px-3 py-1.5 transition ${mode === m ? "font-semibold" : "opacity-80 hover:opacity-100"}`}
                  style={{ borderColor: palette.panelBorder, backgroundColor: mode === m ? palette.accent : "transparent", color: mode === m ? "#001018" : palette.appText }}
                >
                  {m === "ai" ? "Single vs AI" : m === "local" ? "Local 2P" : m === "online" ? "Online" : "Puzzle"}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_330px]">
          <div className="rounded-2xl border p-4 shadow-2xl" style={{ backgroundColor: palette.panel, borderColor: palette.panelBorder }}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm opacity-80">Turn {moveCount + 1}</p>
                <h2 className="text-xl font-semibold">{winner ? `${capitalize(winner)} Wins` : `${capitalize(currentPlayer)} to move`}</h2>
              </div>
              <div className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: palette.panelBorder }}>
                {message}
              </div>
            </div>

            <div className="mx-auto grid w-full max-w-[640px] grid-cols-8 overflow-hidden rounded-xl border-2" style={{ borderColor: palette.panelBorder }}>
              {board.map((row, rowIndex) =>
                row.map((cell, colIndex) => {
                  const dark = isDarkSquare(rowIndex, colIndex);
                  const isSelected = selected ? selected.row === rowIndex && selected.col === colIndex : false;
                  const isMoveTarget = selectedMoves.some((move) => move.to.row === rowIndex && move.to.col === colIndex);
                  const isHintFrom = hintMove ? hintMove.from.row === rowIndex && hintMove.from.col === colIndex : false;
                  const isHintTo = hintMove ? hintMove.to.row === rowIndex && hintMove.to.col === colIndex : false;

                  return (
                    <button
                      key={`${rowIndex}-${colIndex}`}
                      type="button"
                      onClick={() => onSquareClick(rowIndex, colIndex)}
                      className="relative aspect-square transition-transform duration-150 hover:scale-[1.01] focus:outline-none"
                      style={{
                        backgroundColor: dark ? palette.boardDark : palette.boardLight,
                        opacity: dark ? 1 : 0.85,
                        cursor: playerCanInteract && dark ? "pointer" : "default",
                      }}
                      aria-label={`Square ${rowIndex + 1}, ${colIndex + 1}`}
                    >
                      {showCoords && dark && (
                        <span className="absolute left-1 top-1 text-[10px] font-semibold opacity-65">
                          {String.fromCharCode(65 + colIndex)}{BOARD_SIZE - rowIndex}
                        </span>
                      )}

                      {isMoveTarget && (
                        <span
                          className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
                          style={{ backgroundColor: palette.accent }}
                        />
                      )}

                      {(isHintFrom || isHintTo) && hintsOn && (
                        <span className="absolute inset-1 rounded-md border-2" style={{ borderColor: palette.accent }} />
                      )}

                      {isSelected && (
                        <span className="absolute inset-1 rounded-md border-2 border-yellow-300 shadow-[0_0_18px_rgba(253,224,71,0.45)]" />
                      )}

                      {cell && (
                        <span
                          className="absolute left-1/2 top-1/2 grid h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 place-content-center rounded-full border-2 text-lg font-bold shadow-lg"
                          style={{
                            backgroundColor: cell.player === "red" ? palette.redPiece : palette.blackPiece,
                            borderColor: "rgba(255,255,255,0.45)",
                            color: cell.player === "red" ? "#fff5f5" : "#f5f5f5",
                          }}
                        >
                          {cell.king ? "♛" : ""}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button onClick={() => startNewGame(mode)} className="rounded-lg border px-3 py-2 text-sm hover:opacity-90" style={{ borderColor: palette.panelBorder }}>
                New Match
              </button>
              <button onClick={undo} disabled={history.length === 0} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40" style={{ borderColor: palette.panelBorder }}>
                Undo
              </button>
              <button onClick={redo} disabled={future.length === 0} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40" style={{ borderColor: palette.panelBorder }}>
                Redo
              </button>
              <button onClick={saveGame} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: palette.panelBorder }}>
                Save
              </button>
              <button onClick={loadGame} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: palette.panelBorder }}>
                Load
              </button>
              <button onClick={() => setHintsOn((v) => !v)} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: palette.panelBorder }}>
                {hintsOn ? "Hide Hints" : "Show Hints"}
              </button>
              <button onClick={() => setShowCoords((v) => !v)} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: palette.panelBorder }}>
                {showCoords ? "Hide Coords" : "Show Coords"}
              </button>
              <button onClick={() => setPaused((v) => !v)} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: palette.panelBorder }}>
                {paused ? "Resume" : "Pause"}
              </button>
            </div>
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl border p-4" style={{ backgroundColor: palette.panel, borderColor: palette.panelBorder }}>
              <h3 className="text-lg font-semibold">Live Status</h3>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border p-2" style={{ borderColor: palette.panelBorder }}>
                  <p className="opacity-75">Red</p>
                  <p className="font-mono text-lg">{formatTime(timers.red)}</p>
                  <p className="opacity-75">Pieces: {redPieces}</p>
                </div>
                <div className="rounded-lg border p-2" style={{ borderColor: palette.panelBorder }}>
                  <p className="opacity-75">Black</p>
                  <p className="font-mono text-lg">{formatTime(timers.black)}</p>
                  <p className="opacity-75">Pieces: {blackPieces}</p>
                </div>
              </div>
              <div className="mt-3 text-sm">
                {mode === "ai" && <p>{aiThinking ? "AI thinking..." : "AI ready."}</p>}
                {mode === "online" && (
                  <p>
                    Online status: <span className="font-semibold">{onlineStatus}</span>
                    {remoteThinking ? " · Opponent move incoming" : ""}
                  </p>
                )}
                {mode === "puzzle" && (
                  <p>
                    Puzzle moves left: <span className="font-semibold">{puzzleMovesLeft}</span>
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border p-4" style={{ backgroundColor: palette.panel, borderColor: palette.panelBorder }}>
              <h3 className="text-lg font-semibold">Themes</h3>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                {(["minimal", "dark", "playful", "classic", "custom"] as ThemeName[]).map((name) => (
                  <button
                    key={name}
                    onClick={() => setTheme(name)}
                    className={`rounded-lg border px-2 py-2 text-left transition ${theme === name ? "font-semibold" : "opacity-80"}`}
                    style={{ borderColor: palette.panelBorder, backgroundColor: theme === name ? palette.accent : "transparent", color: theme === name ? "#001018" : palette.appText }}
                  >
                    {name}
                  </button>
                ))}
              </div>

              {theme === "custom" && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  {(
                    [
                      ["boardLight", "Light"],
                      ["boardDark", "Dark"],
                      ["redPiece", "Red"],
                      ["blackPiece", "Black"],
                      ["accent", "Accent"],
                    ] as Array<[keyof ThemePalette, string]>
                  ).map(([key, label]) => (
                    <label key={key} className="flex items-center justify-between rounded border px-2 py-1" style={{ borderColor: palette.panelBorder }}>
                      <span>{label}</span>
                      <input
                        type="color"
                        value={customTheme[key]}
                        onChange={(e) => setCustomTheme((prev) => ({ ...prev, [key]: e.target.value }))}
                        className="h-6 w-8 cursor-pointer border-0 bg-transparent"
                        aria-label={`${label} color`}
                      />
                    </label>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border p-4" style={{ backgroundColor: palette.panel, borderColor: palette.panelBorder }}>
              <h3 className="text-lg font-semibold">Puzzle Controls</h3>
              <p className="mt-1 text-xs opacity-80">Switching puzzle restarts the puzzle mode board instantly.</p>
              <div className="mt-3 space-y-2">
                {PUZZLES.map((puzzle, index) => (
                  <button
                    key={puzzle.id}
                    onClick={() => {
                      setPuzzleIndex(index);
                      if (mode === "puzzle") {
                        window.setTimeout(() => startNewGame("puzzle"), 0);
                      }
                    }}
                    className="w-full rounded-lg border px-3 py-2 text-left text-sm"
                    style={{ borderColor: palette.panelBorder, backgroundColor: puzzleIndex === index ? "rgba(255,255,255,0.08)" : "transparent" }}
                  >
                    <p className="font-semibold">{puzzle.name}</p>
                    <p className="text-xs opacity-80">{puzzle.description}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border p-4" style={{ backgroundColor: palette.panel, borderColor: palette.panelBorder }}>
              <h3 className="text-lg font-semibold">Stats & Win Tracking</h3>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded border p-2" style={{ borderColor: palette.panelBorder }}>
                  <p className="opacity-75">Games</p>
                  <p className="text-lg font-bold">{stats.gamesPlayed}</p>
                </div>
                <div className="rounded border p-2" style={{ borderColor: palette.panelBorder }}>
                  <p className="opacity-75">Red Wins</p>
                  <p className="text-lg font-bold">{stats.redWins}</p>
                </div>
                <div className="rounded border p-2" style={{ borderColor: palette.panelBorder }}>
                  <p className="opacity-75">Black Wins</p>
                  <p className="text-lg font-bold">{stats.blackWins}</p>
                </div>
                <div className="rounded border p-2" style={{ borderColor: palette.panelBorder }}>
                  <p className="opacity-75">Draws</p>
                  <p className="text-lg font-bold">{stats.draws}</p>
                </div>
              </div>
              <div className="mt-3 text-xs opacity-85">
                <p>Completed by mode:</p>
                <ul className="mt-1 space-y-1">
                  <li>Local: {stats.completedByMode.local}</li>
                  <li>AI: {stats.completedByMode.ai}</li>
                  <li>Online: {stats.completedByMode.online}</li>
                  <li>Puzzle: {stats.completedByMode.puzzle}</li>
                </ul>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}
