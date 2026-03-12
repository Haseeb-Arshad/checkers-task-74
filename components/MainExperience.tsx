"use client";

import { useEffect, useMemo, useState } from "react";

type Player = "red" | "black";
type GameMode = "single" | "local" | "online" | "puzzle";
type ThemeName = "minimal" | "dark" | "playful" | "classic";
type GameStatus = "playing" | "finished";

interface Piece {
  id: number;
  player: Player;
  king: boolean;
}

type Cell = Piece | null;
type Board = Cell[][];

interface Position {
  row: number;
  col: number;
}

interface Move {
  from: Position;
  to: Position;
  captured?: Position;
}

interface Timers {
  red: number;
  black: number;
}

interface Snapshot {
  board: Board;
  currentPlayer: Player;
  selected: Position | null;
  forcedFrom: Position | null;
  timers: Timers;
  moveLog: string[];
  winner: Player | null;
  gameStatus: GameStatus;
  puzzleTurns: number;
  resultRecorded: boolean;
}

interface Stats {
  gamesPlayed: number;
  redWins: number;
  blackWins: number;
  draws: number;
  puzzleSolved: number;
}

interface ThemeConfig {
  page: string;
  card: string;
  boardLight: string;
  boardDark: string;
  text: string;
  accent: string;
  pieceRed: string;
  pieceBlack: string;
}

interface PuzzleSetup {
  name: string;
  description: string;
  maxRedTurns: number;
  board: Board;
  currentPlayer: Player;
}

const BOARD_SIZE = 8;
const SAVE_KEY = "fun-checkers-save-v1";
const STATS_KEY = "fun-checkers-stats-v1";
const START_TIME = 5 * 60;

const THEMES: Record<ThemeName, ThemeConfig> = {
  minimal: {
    page: "bg-slate-50",
    card: "bg-white border border-slate-200",
    boardLight: "bg-slate-100",
    boardDark: "bg-slate-400",
    text: "text-slate-900",
    accent: "text-indigo-600",
    pieceRed: "from-rose-400 to-rose-600",
    pieceBlack: "from-slate-600 to-slate-800",
  },
  dark: {
    page: "bg-slate-950",
    card: "bg-slate-900 border border-slate-800",
    boardLight: "bg-slate-700",
    boardDark: "bg-slate-900",
    text: "text-slate-100",
    accent: "text-cyan-400",
    pieceRed: "from-red-500 to-rose-700",
    pieceBlack: "from-zinc-300 to-zinc-500",
  },
  playful: {
    page: "bg-gradient-to-br from-violet-50 via-pink-50 to-cyan-50",
    card: "bg-white/90 border border-violet-200",
    boardLight: "bg-yellow-100",
    boardDark: "bg-fuchsia-300",
    text: "text-violet-950",
    accent: "text-fuchsia-600",
    pieceRed: "from-orange-400 to-pink-500",
    pieceBlack: "from-indigo-500 to-violet-700",
  },
  classic: {
    page: "bg-amber-100",
    card: "bg-amber-50 border border-amber-300",
    boardLight: "bg-amber-200",
    boardDark: "bg-amber-700",
    text: "text-amber-950",
    accent: "text-emerald-700",
    pieceRed: "from-red-700 to-red-900",
    pieceBlack: "from-stone-700 to-stone-900",
  },
};

const MODE_LABELS: Record<GameMode, string> = {
  single: "Single vs AI",
  local: "Local 2P",
  online: "Online",
  puzzle: "Puzzle",
};

const DEFAULT_STATS: Stats = {
  gamesPlayed: 0,
  redWins: 0,
  blackWins: 0,
  draws: 0,
  puzzleSolved: 0,
};

function inBounds(row: number, col: number) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function cloneBoard(board: Board): Board {
  return board.map((r) => r.map((c) => (c ? { ...c } : null)));
}

function buildStandardBoard(): Board {
  const board: Board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  );
  let id = 1;

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if ((row + col) % 2 === 1) {
        board[row][col] = { id: id += 1, player: "black", king: false };
      }
    }
  }

  for (let row = 5; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if ((row + col) % 2 === 1) {
        board[row][col] = { id: id += 1, player: "red", king: false };
      }
    }
  }

  return board;
}

function makePuzzleBoard(placements: Array<{ row: number; col: number; player: Player; king?: boolean }>): Board {
  const board: Board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  );
  let id = 1000;
  placements.forEach((p) => {
    board[p.row][p.col] = {
      id: id += 1,
      player: p.player,
      king: Boolean(p.king),
    };
  });
  return board;
}

function getPuzzle(index: number): PuzzleSetup {
  const puzzles: PuzzleSetup[] = [
    {
      name: "Puzzle 1: Opening Trap",
      description: "Red to move. Win by forcing captures in 2 red turns.",
      maxRedTurns: 2,
      currentPlayer: "red",
      board: makePuzzleBoard([
        { row: 5, col: 0, player: "red" },
        { row: 5, col: 2, player: "red" },
        { row: 4, col: 3, player: "black" },
        { row: 2, col: 5, player: "black" },
      ]),
    },
    {
      name: "Puzzle 2: King Me",
      description: "Promote quickly and convert the advantage in 3 red turns.",
      maxRedTurns: 3,
      currentPlayer: "red",
      board: makePuzzleBoard([
        { row: 2, col: 1, player: "red" },
        { row: 6, col: 5, player: "red" },
        { row: 1, col: 2, player: "black" },
        { row: 3, col: 4, player: "black" },
      ]),
    },
    {
      name: "Puzzle 3: Double Jump",
      description: "Spot the chain capture and clear the board in 2 turns.",
      maxRedTurns: 2,
      currentPlayer: "red",
      board: makePuzzleBoard([
        { row: 5, col: 4, player: "red" },
        { row: 4, col: 3, player: "black" },
        { row: 2, col: 1, player: "black" },
        { row: 6, col: 1, player: "red" },
      ]),
    },
    {
      name: "Puzzle 4: Endgame Sprint",
      description: "Win in 3 turns against a king threat.",
      maxRedTurns: 3,
      currentPlayer: "red",
      board: makePuzzleBoard([
        { row: 7, col: 2, player: "red", king: true },
        { row: 5, col: 6, player: "red" },
        { row: 2, col: 5, player: "black", king: true },
        { row: 4, col: 1, player: "black" },
      ]),
    },
    {
      name: "Puzzle 5: Precision Win",
      description: "Only one best line. Beat black in 2 red turns.",
      maxRedTurns: 2,
      currentPlayer: "red",
      board: makePuzzleBoard([
        { row: 5, col: 6, player: "red" },
        { row: 3, col: 4, player: "black" },
        { row: 1, col: 2, player: "black" },
        { row: 7, col: 0, player: "red" },
      ]),
    },
  ];

  return puzzles[index] ?? puzzles[0];
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
  return piece.player === "red"
    ? [
        [-1, -1],
        [-1, 1],
      ]
    : [
        [1, -1],
        [1, 1],
      ];
}

function getMovesForPiece(board: Board, row: number, col: number, piece: Piece): Move[] {
  const moves: Move[] = [];
  for (const [dr, dc] of getDirections(piece)) {
    const stepR = row + dr;
    const stepC = col + dc;
    if (!inBounds(stepR, stepC)) continue;

    if (!board[stepR][stepC]) {
      moves.push({ from: { row, col }, to: { row: stepR, col: stepC } });
      continue;
    }

    const jumped = board[stepR][stepC];
    if (jumped && jumped.player !== piece.player) {
      const landR = stepR + dr;
      const landC = stepC + dc;
      if (inBounds(landR, landC) && !board[landR][landC]) {
        moves.push({
          from: { row, col },
          to: { row: landR, col: landC },
          captured: { row: stepR, col: stepC },
        });
      }
    }
  }
  return moves;
}

function getAllLegalMoves(board: Board, player: Player, forcedFrom: Position | null): Move[] {
  const allMoves: Move[] = [];

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const piece = board[row][col];
      if (!piece || piece.player !== player) continue;
      if (forcedFrom && (forcedFrom.row !== row || forcedFrom.col !== col)) continue;
      allMoves.push(...getMovesForPiece(board, row, col, piece));
    }
  }

  const captures = allMoves.filter((m) => Boolean(m.captured));
  return captures.length > 0 ? captures : allMoves;
}

function coord(pos: Position): string {
  const file = String.fromCharCode(97 + pos.col);
  const rank = (8 - pos.row).toString();
  return `${file}${rank}`;
}

function formatTime(totalSeconds: number): string {
  const clamped = Math.max(totalSeconds, 0);
  const minutes = Math.floor(clamped / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(clamped % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function pickHintMove(moves: Move[]): Move | null {
  if (moves.length === 0) return null;
  const captures = moves.filter((m) => m.captured);
  const prioritized = captures.length > 0 ? captures : moves;

  const kinging = prioritized.find((m) => m.to.row === 0 || m.to.row === 7);
  if (kinging) return kinging;

  return prioritized[0];
}

function countPieces(board: Board) {
  let red = 0;
  let black = 0;
  for (let r = 0; r < BOARD_SIZE; r += 1) {
    for (let c = 0; c < BOARD_SIZE; c += 1) {
      const p = board[r][c];
      if (!p) continue;
      if (p.player === "red") red += 1;
      else black += 1;
    }
  }
  return { red, black };
}

export default function MainExperience() {
  const [mode, setMode] = useState<GameMode>("single");
  const [theme, setTheme] = useState<ThemeName>("dark");
  const [board, setBoard] = useState<Board>(() => buildStandardBoard());
  const [currentPlayer, setCurrentPlayer] = useState<Player>("red");
  const [selected, setSelected] = useState<Position | null>(null);
  const [forcedFrom, setForcedFrom] = useState<Position | null>(null);
  const [timers, setTimers] = useState<Timers>({ red: START_TIME, black: START_TIME });
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [moveLog, setMoveLog] = useState<string[]>([]);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);
  const [winner, setWinner] = useState<Player | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>("playing");
  const [statusMessage, setStatusMessage] = useState("Select a red checker to start.");
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const [isThinking, setIsThinking] = useState(false);
  const [hintMove, setHintMove] = useState<Move | null>(null);
  const [activePuzzle, setActivePuzzle] = useState(0);
  const [puzzleTurns, setPuzzleTurns] = useState(0);
  const [maxPuzzleTurns, setMaxPuzzleTurns] = useState(2);
  const [puzzleDescription, setPuzzleDescription] = useState<string>("");
  const [resultRecorded, setResultRecorded] = useState(false);

  const themeConfig = THEMES[theme];

  const legalMoves = useMemo(
    () => getAllLegalMoves(board, currentPlayer, forcedFrom),
    [board, currentPlayer, forcedFrom],
  );

  const selectedMoves = useMemo(() => {
    if (!selected) return [] as Move[];
    return legalMoves.filter(
      (m) => m.from.row === selected.row && m.from.col === selected.col,
    );
  }, [legalMoves, selected]);

  const aiTurn =
    gameStatus === "playing" &&
    (mode === "single" || mode === "puzzle") &&
    currentPlayer === "black";

  const snapshotCurrent = (): Snapshot => ({
    board: cloneBoard(board),
    currentPlayer,
    selected,
    forcedFrom,
    timers: { ...timers },
    moveLog: [...moveLog],
    winner,
    gameStatus,
    puzzleTurns,
    resultRecorded,
  });

  const applySnapshot = (snap: Snapshot) => {
    setBoard(cloneBoard(snap.board));
    setCurrentPlayer(snap.currentPlayer);
    setSelected(snap.selected);
    setForcedFrom(snap.forcedFrom);
    setTimers({ ...snap.timers });
    setMoveLog([...snap.moveLog]);
    setWinner(snap.winner);
    setGameStatus(snap.gameStatus);
    setPuzzleTurns(snap.puzzleTurns);
    setResultRecorded(snap.resultRecorded);
    setHintMove(null);
    setIsThinking(false);
  };

  const newGame = (nextMode: GameMode = mode, puzzleIdx = activePuzzle) => {
    if (nextMode === "puzzle") {
      const puzzle = getPuzzle(puzzleIdx);
      setBoard(cloneBoard(puzzle.board));
      setCurrentPlayer(puzzle.currentPlayer);
      setPuzzleTurns(0);
      setMaxPuzzleTurns(puzzle.maxRedTurns);
      setPuzzleDescription(`${puzzle.name} — ${puzzle.description}`);
      setStatusMessage("Puzzle loaded. You are red. Find the winning line.");
    } else {
      setBoard(buildStandardBoard());
      setCurrentPlayer("red");
      setPuzzleTurns(0);
      setMaxPuzzleTurns(2);
      setPuzzleDescription("");
      setStatusMessage(
        nextMode === "online"
          ? "Online mode UI is ready; live matchmaking is not connected yet."
          : "Fresh game started. Red moves first.",
      );
    }

    setSelected(null);
    setForcedFrom(null);
    setTimers({ red: START_TIME, black: START_TIME });
    setMoveLog([]);
    setHistory([]);
    setFuture([]);
    setWinner(null);
    setGameStatus("playing");
    setHintMove(null);
    setIsThinking(false);
    setResultRecorded(false);
  };

  useEffect(() => {
    const rawStats = localStorage.getItem(STATS_KEY);
    if (rawStats) {
      try {
        const parsed = JSON.parse(rawStats) as Stats;
        setStats({ ...DEFAULT_STATS, ...parsed });
      } catch {
        setStats(DEFAULT_STATS);
      }
    }

    if (mode === "puzzle") {
      newGame("puzzle", 0);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    if (gameStatus !== "playing") return;
    if (!timerEnabled) return;

    const id = setInterval(() => {
      setTimers((prev) => {
        const next = { ...prev };
        next[currentPlayer] = Math.max(0, next[currentPlayer] - 1);

        if (next[currentPlayer] === 0) {
          const victor: Player = currentPlayer === "red" ? "black" : "red";
          setWinner(victor);
          setGameStatus("finished");
          setStatusMessage(`${victor.toUpperCase()} wins on time.`);
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [currentPlayer, gameStatus, timerEnabled]);

  useEffect(() => {
    if (!aiTurn || mode === "online") return;
    if (legalMoves.length === 0) return;

    setIsThinking(true);
    const timeout = setTimeout(() => {
      const captures = legalMoves.filter((m) => m.captured);
      const pool = captures.length > 0 ? captures : legalMoves;
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      if (chosen) {
        makeMove(chosen, "AI");
      }
      setIsThinking(false);
    }, 600);

    return () => clearTimeout(timeout);
  }, [aiTurn, legalMoves, mode]);

  useEffect(() => {
    if (gameStatus !== "playing") return;
    if (legalMoves.length > 0) return;

    const victor: Player = currentPlayer === "red" ? "black" : "red";
    setWinner(victor);
    setGameStatus("finished");
    setStatusMessage(`${victor.toUpperCase()} wins — no legal moves left.`);
  }, [currentPlayer, gameStatus, legalMoves]);

  useEffect(() => {
    if (!winner || resultRecorded) return;

    setStats((prev) => ({
      ...prev,
      gamesPlayed: prev.gamesPlayed + 1,
      redWins: prev.redWins + (winner === "red" ? 1 : 0),
      blackWins: prev.blackWins + (winner === "black" ? 1 : 0),
      puzzleSolved:
        prev.puzzleSolved + (mode === "puzzle" && winner === "red" ? 1 : 0),
    }));
    setResultRecorded(true);
  }, [winner, resultRecorded, mode]);

  const makeMove = (move: Move, actor: "Player" | "AI" = "Player") => {
    if (gameStatus !== "playing") return;

    const before = snapshotCurrent();
    setHistory((h) => [...h, before]);
    setFuture([]);

    const nextBoard = cloneBoard(board);
    const movingPiece = nextBoard[move.from.row][move.from.col];
    if (!movingPiece) return;

    nextBoard[move.from.row][move.from.col] = null;
    if (move.captured) {
      nextBoard[move.captured.row][move.captured.col] = null;
    }

    const becameKing =
      !movingPiece.king &&
      ((movingPiece.player === "red" && move.to.row === 0) ||
        (movingPiece.player === "black" && move.to.row === 7));

    const movedPiece: Piece = {
      ...movingPiece,
      king: movingPiece.king || becameKing,
    };

    nextBoard[move.to.row][move.to.col] = movedPiece;

    const notation = `${actor} ${movingPiece.player.toUpperCase()}: ${coord(move.from)} ${move.captured ? "x" : "→"} ${coord(move.to)}${becameKing ? " (KING)" : ""}`;
    const nextLog = [notation, ...moveLog].slice(0, 20);

    let nextPlayer: Player = movingPiece.player === "red" ? "black" : "red";
    let continueFrom: Position | null = null;
    let nextPuzzleTurns = puzzleTurns;

    if (move.captured) {
      const chainMoves = getMovesForPiece(nextBoard, move.to.row, move.to.col, movedPiece).filter(
        (m) => Boolean(m.captured),
      );
      if (chainMoves.length > 0) {
        nextPlayer = movingPiece.player;
        continueFrom = { ...move.to };
      }
    }

    if (mode === "puzzle" && movingPiece.player === "red" && nextPlayer === "black") {
      nextPuzzleTurns += 1;
    }

    const pieceCounts = countPieces(nextBoard);

    let nextWinner: Player | null = null;
    let nextStatus: GameStatus = "playing";
    let nextMessage = `${nextPlayer.toUpperCase()} to move.`;

    if (pieceCounts.red === 0) {
      nextWinner = "black";
      nextStatus = "finished";
      nextMessage = "BLACK wins by capturing all red pieces.";
    } else if (pieceCounts.black === 0) {
      nextWinner = "red";
      nextStatus = "finished";
      nextMessage = "RED wins by capturing all black pieces.";
    } else {
      const responseMoves = getAllLegalMoves(nextBoard, nextPlayer, continueFrom);
      if (responseMoves.length === 0) {
        nextWinner = nextPlayer === "red" ? "black" : "red";
        nextStatus = "finished";
        nextMessage = `${nextWinner.toUpperCase()} wins — opponent is blocked.`;
      }
    }

    if (mode === "puzzle" && nextStatus === "playing" && nextPuzzleTurns > maxPuzzleTurns) {
      nextWinner = "black";
      nextStatus = "finished";
      nextMessage = "Puzzle failed: turn limit exceeded. Try a cleaner line.";
    }

    setBoard(nextBoard);
    setMoveLog(nextLog);
    setCurrentPlayer(nextPlayer);
    setForcedFrom(continueFrom);
    setSelected(continueFrom);
    setPuzzleTurns(nextPuzzleTurns);
    setHintMove(null);

    if (continueFrom) {
      setStatusMessage("Multi-capture available: continue with the same piece.");
    } else {
      setStatusMessage(nextMessage);
    }

    setWinner(nextWinner);
    setGameStatus(nextStatus);
  };

  const onSquareClick = (row: number, col: number) => {
    if (mode === "online") {
      setStatusMessage("Online matchmaking is not wired yet. Use Local or Single for now.");
      return;
    }
    if (gameStatus !== "playing") return;
    if (isThinking) return;

    const targetMove = selectedMoves.find((m) => m.to.row === row && m.to.col === col);
    if (targetMove) {
      makeMove(targetMove, "Player");
      return;
    }

    const piece = board[row][col];
    if (!piece || piece.player !== currentPlayer) {
      setSelected(null);
      return;
    }

    if (forcedFrom && (forcedFrom.row !== row || forcedFrom.col !== col)) {
      setStatusMessage("You must continue capturing with the highlighted checker.");
      return;
    }

    const pieceMoves = legalMoves.filter((m) => m.from.row === row && m.from.col === col);
    if (pieceMoves.length === 0) {
      setStatusMessage("That checker has no legal move right now.");
      setSelected(null);
      return;
    }

    setSelected({ row, col });
  };

  const undo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    const current = snapshotCurrent();
    setHistory((h) => h.slice(0, -1));
    setFuture((f) => [current, ...f]);
    applySnapshot(prev);
    setStatusMessage("Undid last move.");
  };

  const redo = () => {
    if (future.length === 0) return;
    const next = future[0];
    const current = snapshotCurrent();
    setFuture((f) => f.slice(1));
    setHistory((h) => [...h, current]);
    applySnapshot(next);
    setStatusMessage("Redid move.");
  };

  const showHint = () => {
    if (gameStatus !== "playing") return;
    const hint = pickHintMove(legalMoves);
    if (!hint) {
      setStatusMessage("No hint available — no legal moves.");
      setHintMove(null);
      return;
    }
    setHintMove(hint);
    setSelected(hint.from);
    setStatusMessage(`Hint: ${coord(hint.from)} ${hint.captured ? "x" : "→"} ${coord(hint.to)}`);
  };

  const saveGame = () => {
    const payload = {
      mode,
      theme,
      activePuzzle,
      maxPuzzleTurns,
      puzzleDescription,
      timerEnabled,
      snapshot: snapshotCurrent(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    setStatusMessage("Game saved locally. You can load it anytime.");
  };

  const loadGame = () => {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      setStatusMessage("No saved game found yet.");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as {
        mode: GameMode;
        theme: ThemeName;
        activePuzzle: number;
        maxPuzzleTurns: number;
        puzzleDescription: string;
        timerEnabled: boolean;
        snapshot: Snapshot;
      };

      setMode(parsed.mode);
      setTheme(parsed.theme);
      setActivePuzzle(parsed.activePuzzle ?? 0);
      setMaxPuzzleTurns(parsed.maxPuzzleTurns ?? 2);
      setPuzzleDescription(parsed.puzzleDescription ?? "");
      setTimerEnabled(Boolean(parsed.timerEnabled));
      setHistory([]);
      setFuture([]);
      applySnapshot(parsed.snapshot);
      setStatusMessage("Saved game loaded.");
    } catch {
      setStatusMessage("Saved game data is corrupted.");
    }
  };

  const winRate =
    stats.gamesPlayed === 0
      ? 0
      : Math.round(((stats.redWins + stats.blackWins) / stats.gamesPlayed) * 100);

  return (
    <main className={`min-h-screen ${themeConfig.page} ${themeConfig.text} transition-colors duration-300`}>
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
        <header className={`mb-6 rounded-2xl p-5 shadow-sm ${themeConfig.card}`}>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Fun Checkers Arena</h1>
          <p className="mt-1 text-sm opacity-80 md:text-base">
            Fast games, hints, timer pressure, save/load, puzzle challenges, and smart AI.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide opacity-70">Mode</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(MODE_LABELS) as GameMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMode(m);
                      newGame(m, m === "puzzle" ? activePuzzle : 0);
                    }}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      mode === m ? "bg-indigo-600 text-white" : "bg-slate-200/60 text-slate-900 hover:bg-slate-300/70"
                    }`}
                  >
                    {MODE_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide opacity-70">Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as ThemeName)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="minimal">Minimal / Clean</option>
                <option value="dark">Dark / Modern</option>
                <option value="playful">Playful / Colorful</option>
                <option value="classic">Classic / Wooden</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide opacity-70">Actions</label>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => newGame(mode, activePuzzle)} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
                  New Game
                </button>
                <button onClick={saveGame} className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-600">
                  Save
                </button>
                <button onClick={loadGame} className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-600">
                  Load
                </button>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className={`rounded-2xl p-4 shadow-sm ${themeConfig.card}`}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">
                Turn: <span className={themeConfig.accent}>{currentPlayer.toUpperCase()}</span>
                {isThinking ? " • AI is thinking..." : ""}
              </p>
              <p className="text-sm opacity-80">Moves: {moveLog.length}</p>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <button
                onClick={undo}
                disabled={history.length === 0}
                className="rounded-md bg-slate-600 px-3 py-2 text-xs font-semibold text-white enabled:hover:bg-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Undo
              </button>
              <button
                onClick={redo}
                disabled={future.length === 0}
                className="rounded-md bg-slate-600 px-3 py-2 text-xs font-semibold text-white enabled:hover:bg-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Redo
              </button>
              <button onClick={showHint} className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500">
                Move Hint
              </button>
              <button
                onClick={() => setTimerEnabled((v) => !v)}
                className="rounded-md bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-500"
              >
                Timer: {timerEnabled ? "On" : "Off"}
              </button>
            </div>

            <div className="relative mx-auto max-w-[560px]">
              <div className="grid grid-cols-8 overflow-hidden rounded-xl border-4 border-slate-900/30 shadow-lg">
                {board.map((row, rowIdx) =>
                  row.map((cell, colIdx) => {
                    const dark = (rowIdx + colIdx) % 2 === 1;
                    const isSelected = selected?.row === rowIdx && selected?.col === colIdx;
                    const legalDest = selectedMoves.some(
                      (m) => m.to.row === rowIdx && m.to.col === colIdx,
                    );
                    const isHintFrom = hintMove?.from.row === rowIdx && hintMove?.from.col === colIdx;
                    const isHintTo = hintMove?.to.row === rowIdx && hintMove?.to.col === colIdx;

                    return (
                      <button
                        key={`${rowIdx}-${colIdx}`}
                        type="button"
                        onClick={() => onSquareClick(rowIdx, colIdx)}
                        className={`relative aspect-square ${dark ? themeConfig.boardDark : themeConfig.boardLight} transition ${
                          isSelected ? "ring-4 ring-cyan-400 ring-inset" : ""
                        } ${isHintFrom ? "ring-4 ring-emerald-400 ring-inset" : ""} ${isHintTo ? "outline outline-4 outline-emerald-300" : ""}`}
                        aria-label={`Row ${rowIdx + 1} Col ${colIdx + 1}`}
                      >
                        {legalDest && !cell && (
                          <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/90" />
                        )}

                        {cell && (
                          <span
                            className={`absolute left-1/2 top-1/2 flex h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br ${
                              cell.player === "red" ? themeConfig.pieceRed : themeConfig.pieceBlack
                            } shadow-lg`}
                          >
                            {cell.king ? (
                              <span className="text-lg text-yellow-200" aria-hidden>
                                ♛
                              </span>
                            ) : null}
                          </span>
                        )}
                      </button>
                    );
                  }),
                )}
              </div>

              {mode === "online" && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/65 p-4 text-center text-white">
                  <div>
                    <p className="text-lg font-bold">Online Multiplayer Lobby</p>
                    <p className="mt-1 text-sm opacity-90">
                      UI is ready, but realtime server wiring is pending. Start Local 2P to play now.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <p className="mt-4 rounded-lg bg-slate-800/10 px-3 py-2 text-sm">{statusMessage}</p>
          </div>

          <aside className="space-y-4">
            <div className={`rounded-2xl p-4 shadow-sm ${themeConfig.card}`}>
              <h2 className="text-sm font-bold uppercase tracking-wide opacity-80">Timers</h2>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Red</span>
                  <span className="font-mono">{formatTime(timers.red)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Black</span>
                  <span className="font-mono">{formatTime(timers.black)}</span>
                </div>
              </div>
            </div>

            {mode === "puzzle" && (
              <div className={`rounded-2xl p-4 shadow-sm ${themeConfig.card}`}>
                <h2 className="text-sm font-bold uppercase tracking-wide opacity-80">Puzzle Challenge</h2>
                <p className="mt-2 text-sm">{puzzleDescription}</p>
                <p className="mt-2 text-xs opacity-80">
                  Red turns used: {puzzleTurns}/{maxPuzzleTurns}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setActivePuzzle(idx);
                        newGame("puzzle", idx);
                      }}
                      className={`rounded-md px-2 py-1 text-xs font-semibold ${
                        activePuzzle === idx
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-200 text-slate-800 hover:bg-slate-300"
                      }`}
                    >
                      Puzzle {idx + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={`rounded-2xl p-4 shadow-sm ${themeConfig.card}`}>
              <h2 className="text-sm font-bold uppercase tracking-wide opacity-80">Stats</h2>
              <ul className="mt-3 space-y-1 text-sm">
                <li>Games played: {stats.gamesPlayed}</li>
                <li>Red wins: {stats.redWins}</li>
                <li>Black wins: {stats.blackWins}</li>
                <li>Puzzles solved: {stats.puzzleSolved}</li>
                <li>Win result rate: {winRate}%</li>
              </ul>
            </div>

            <div className={`rounded-2xl p-4 shadow-sm ${themeConfig.card}`}>
              <h2 className="text-sm font-bold uppercase tracking-wide opacity-80">Recent Moves</h2>
              <div className="mt-2 max-h-48 space-y-1 overflow-auto pr-1 text-xs">
                {moveLog.length === 0 ? (
                  <p className="opacity-70">No moves yet.</p>
                ) : (
                  moveLog.map((entry, idx) => (
                    <p key={`${entry}-${idx}`} className="rounded bg-slate-800/10 px-2 py-1">
                      {entry}
                    </p>
                  ))
                )}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
