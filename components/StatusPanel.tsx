"use client";

import type { ReactNode } from "react";

type StatusState = "empty" | "error" | "completion" | "loading" | "info";

type ActionConfig = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

export type StatusPanelProps = {
  state: StatusState;
  title?: string;
  message?: string;
  details?: string;
  primaryAction?: ActionConfig;
  secondaryAction?: ActionConfig;
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
};

const STATE_STYLES: Record<
  StatusState,
  {
    container: string;
    ring: string;
    defaultIcon: string;
    defaultTitle: string;
    defaultMessage: string;
  }
> = {
  empty: {
    container:
      "bg-slate-900/70 border-slate-700 text-slate-100 shadow-slate-950/40",
    ring: "ring-slate-600/30",
    defaultIcon: "🧩",
    defaultTitle: "Nothing here yet",
    defaultMessage:
      "Start a new match or load a saved game to jump back into the board.",
  },
  error: {
    container:
      "bg-rose-950/60 border-rose-700/70 text-rose-50 shadow-rose-950/40",
    ring: "ring-rose-500/20",
    defaultIcon: "⚠️",
    defaultTitle: "Something went wrong",
    defaultMessage:
      "We hit an unexpected issue. You can retry safely without losing your progress.",
  },
  completion: {
    container:
      "bg-emerald-950/60 border-emerald-700/70 text-emerald-50 shadow-emerald-950/40",
    ring: "ring-emerald-500/20",
    defaultIcon: "🏆",
    defaultTitle: "Game complete",
    defaultMessage:
      "Great round! Your result has been recorded. Start another game when you are ready.",
  },
  loading: {
    container:
      "bg-indigo-950/60 border-indigo-700/70 text-indigo-50 shadow-indigo-950/40",
    ring: "ring-indigo-500/20",
    defaultIcon: "⏳",
    defaultTitle: "Preparing game data",
    defaultMessage:
      "We are setting up your board and syncing preferences. This should only take a moment.",
  },
  info: {
    container:
      "bg-cyan-950/60 border-cyan-700/70 text-cyan-50 shadow-cyan-950/40",
    ring: "ring-cyan-500/20",
    defaultIcon: "ℹ️",
    defaultTitle: "Heads up",
    defaultMessage: "A quick update about the current game state.",
  },
};

function SpinnerIcon() {
  return (
    <span
      className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
  );
}

export default function StatusPanel({
  state,
  title,
  message,
  details,
  primaryAction,
  secondaryAction,
  icon,
  className,
  children,
}: StatusPanelProps) {
  const style = STATE_STYLES[state];
  const resolvedTitle = title ?? style.defaultTitle;
  const resolvedMessage = message ?? style.defaultMessage;

  return (
    <section
      role={state === "error" ? "alert" : "status"}
      aria-live={state === "error" ? "assertive" : "polite"}
      className={[
        "w-full rounded-2xl border p-5 sm:p-6",
        "shadow-xl ring-1 transition-all duration-200",
        style.container,
        style.ring,
        className ?? "",
      ].join(" ")}
    >
      <div className="flex items-start gap-4">
        <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/20 text-2xl">
          {icon ?? (state === "loading" ? <SpinnerIcon /> : <span>{style.defaultIcon}</span>)}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold tracking-tight">{resolvedTitle}</h3>
          <p className="mt-1 text-sm leading-relaxed text-white/85">{resolvedMessage}</p>

          {details ? (
            <p className="mt-2 rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-xs leading-relaxed text-white/80">
              {details}
            </p>
          ) : null}

          {children ? <div className="mt-3 text-sm text-white/90">{children}</div> : null}

          {(primaryAction || secondaryAction) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {primaryAction ? (
                <button
                  type="button"
                  onClick={primaryAction.onClick}
                  disabled={primaryAction.disabled}
                  className="inline-flex items-center rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {primaryAction.label}
                </button>
              ) : null}

              {secondaryAction ? (
                <button
                  type="button"
                  onClick={secondaryAction.onClick}
                  disabled={secondaryAction.disabled}
                  className="inline-flex items-center rounded-lg border border-white/35 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {secondaryAction.label}
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
