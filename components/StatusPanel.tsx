"use client";

import type { ReactNode } from "react";

type StatusVariant =
  | "idle"
  | "loading"
  | "empty"
  | "error"
  | "success"
  | "complete"
  | "paused";

export interface StatusPanelProps {
  variant?: StatusVariant;
  title: string;
  description?: string;
  details?: ReactNode;
  actionLabel?: string;
  secondaryActionLabel?: string;
  onAction?: () => void;
  onSecondaryAction?: () => void;
  className?: string;
  compact?: boolean;
  children?: ReactNode;
}

interface VariantConfig {
  icon: string;
  ring: string;
  bg: string;
  iconBg: string;
  title: string;
  description: string;
  button: string;
}

const variantMap: Record<StatusVariant, VariantConfig> = {
  idle: {
    icon: "🎮",
    ring: "ring-slate-700/40",
    bg: "from-slate-900/70 to-slate-800/60",
    iconBg: "bg-slate-700/60",
    title: "Ready to Play",
    description: "Start a new game, load a save, or pick a challenge.",
    button: "bg-slate-200 text-slate-900 hover:bg-white",
  },
  loading: {
    icon: "⏳",
    ring: "ring-cyan-600/40",
    bg: "from-cyan-900/40 to-slate-900/70",
    iconBg: "bg-cyan-600/30",
    title: "Loading",
    description: "Preparing board state and syncing game data.",
    button: "bg-cyan-300 text-slate-900 hover:bg-cyan-200",
  },
  empty: {
    icon: "🧩",
    ring: "ring-violet-600/40",
    bg: "from-violet-900/30 to-slate-900/70",
    iconBg: "bg-violet-600/30",
    title: "No Matches Yet",
    description: "There are no active rounds. Start one and make your first move.",
    button: "bg-violet-300 text-slate-900 hover:bg-violet-200",
  },
  error: {
    icon: "⚠️",
    ring: "ring-rose-600/45",
    bg: "from-rose-900/40 to-slate-900/80",
    iconBg: "bg-rose-600/30",
    title: "Something Went Wrong",
    description: "The game hit an issue. Retry the action or reset the board state.",
    button: "bg-rose-300 text-slate-900 hover:bg-rose-200",
  },
  success: {
    icon: "✅",
    ring: "ring-emerald-600/45",
    bg: "from-emerald-900/35 to-slate-900/80",
    iconBg: "bg-emerald-600/35",
    title: "Action Completed",
    description: "Your move was saved and the board is up to date.",
    button: "bg-emerald-300 text-slate-900 hover:bg-emerald-200",
  },
  complete: {
    icon: "🏆",
    ring: "ring-amber-500/45",
    bg: "from-amber-900/30 to-slate-900/80",
    iconBg: "bg-amber-600/30",
    title: "Match Complete",
    description: "Great game. Review stats, then queue up your next showdown.",
    button: "bg-amber-300 text-slate-900 hover:bg-amber-200",
  },
  paused: {
    icon: "⏸️",
    ring: "ring-indigo-500/45",
    bg: "from-indigo-900/35 to-slate-900/80",
    iconBg: "bg-indigo-600/30",
    title: "Game Paused",
    description: "Take a breath. Resume anytime from this exact board state.",
    button: "bg-indigo-300 text-slate-900 hover:bg-indigo-200",
  },
};

function cx(...parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(" ");
}

export function StatusPanel({
  variant = "idle",
  title,
  description,
  details,
  actionLabel,
  secondaryActionLabel,
  onAction,
  onSecondaryAction,
  className,
  compact = false,
  children,
}: StatusPanelProps) {
  const config = variantMap[variant];

  return (
    <section
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={cx(
        "relative overflow-hidden rounded-2xl border border-white/10 ring-1",
        config.ring,
        "bg-gradient-to-br backdrop-blur-sm",
        config.bg,
        compact ? "p-4" : "p-6 sm:p-8",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_45%)]" />

      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div
            className={cx(
              "grid h-10 w-10 place-items-center rounded-xl text-lg shadow-lg",
              config.iconBg,
            )}
            aria-hidden="true"
          >
            {config.icon}
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white sm:text-lg">
              {title || config.title}
            </h3>
            <p className="text-sm leading-relaxed text-slate-200/90">
              {description || config.description}
            </p>
          </div>
        </div>

        {details ? (
          <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-slate-200">
            {details}
          </div>
        ) : null}

        {children ? <div>{children}</div> : null}

        {(actionLabel || secondaryActionLabel) && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {actionLabel ? (
              <button
                type="button"
                onClick={onAction}
                className={cx(
                  "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold",
                  "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
                  config.button,
                  onAction ? "cursor-pointer" : "cursor-not-allowed opacity-70",
                )}
                disabled={!onAction}
              >
                {actionLabel}
              </button>
            ) : null}

            {secondaryActionLabel ? (
              <button
                type="button"
                onClick={onSecondaryAction}
                className={cx(
                  "inline-flex items-center justify-center rounded-lg border border-white/25 bg-white/5 px-4 py-2",
                  "text-sm font-medium text-slate-100 transition-colors duration-200",
                  "hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
                  onSecondaryAction ? "cursor-pointer" : "cursor-not-allowed opacity-70",
                )}
                disabled={!onSecondaryAction}
              >
                {secondaryActionLabel}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

export default StatusPanel;
