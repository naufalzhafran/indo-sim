import { useEffect, useRef, useId, type ReactNode } from "react";
import { getLocale, getLanguage, localize } from "./i18n";
import type { Metrics as Snapshot } from "./engine/economy/types";
export const number = (n: number, d = 1) =>
  new Intl.NumberFormat(getLocale(), {
    maximumFractionDigits: d,
    minimumFractionDigits: d,
  }).format(n);
export const money = (n: number) =>
  `Rp ${number(n, Math.abs(n) >= 1000 ? 0 : 1)}T`;
export const date = (month: number) =>
  new Intl.DateTimeFormat(getLanguage() === "id" ? "id-ID" : "en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2025, month, 1)));
export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    map: (
      <>
        <path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Z" />
        <path d="M9 3v16m6-14v16" />
      </>
    ),
    budget: (
      <>
        <path d="M3 7h18v14H3zM3 7l9-5 9 5M7 11v6m5-6v6m5-6v6" />
      </>
    ),
    policy: (
      <>
        <path d="M6 3h12v18H6zM9 7h6m-6 5h6m-6 5h4" />
      </>
    ),
    briefing: (
      <>
        <path d="M4 3h16v18H4zM8 7h8m-8 4h8m-8 4h3m3 0h2m-8 3h8" />
      </>
    ),
    book: (
      <>
        <path d="M12 5C8 2 4 3 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-2-1-6-2-10 1Zm0 0v16" />
      </>
    ),
    arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
    download: (
      <>
        <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6m0-10v1" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.info}
    </svg>
  );
}
export function Modal({
  title,
  onClose,
  children,
  className = "",
  dismissible = true,
  trapFocus = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  dismissible?: boolean;
  trapFocus?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current!;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    d.showModal();
    return () => {
      d.close();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  return localize(
    <dialog
      className={className}
      ref={ref}
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (!trapFocus || event.key !== "Tab") return;
        const stops = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            "button, a[href], input, select, textarea, [tabindex]",
          ),
        ).filter(
          (element) =>
            element.tabIndex >= 0 &&
            !element.matches(":disabled") &&
            element.getClientRects().length > 0,
        );
        const first = stops[0];
        const last = stops[stops.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(e) => {
        e.preventDefault();
        if (dismissible) onClose();
      }}
      onClick={(e) => {
        if (dismissible && e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-top">
        <h2 id={titleId}>{title}</h2>
        {dismissible && (
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <Icon name="close" />
          </button>
        )}
      </div>
      <div className="dialog-content" tabIndex={0}>
        {children}
      </div>
    </dialog>,
  );
}
export function Sparkline({
  history,
  field,
}: {
  history: Snapshot[];
  field: keyof Snapshot;
}) {
  const vals = history.map((x) => x[field]);
  if (vals.length < 2)
    return localize(
      <div className="chart-empty">
        Your first trend appears after one month.
      </div>,
    );
  const min = Math.min(...vals),
    max = Math.max(...vals),
    span = max - min || 1;
  const points = vals
    .map(
      (v, i) =>
        `${(i / (vals.length - 1)) * 300},${65 - ((v - min) / span) * 50}`,
    )
    .join(" ");
  return localize(
    <svg
      viewBox="0 0 300 80"
      className="sparkline"
      role="img"
      aria-label={`${field}: ${number(vals[0])} to ${number(vals.at(-1)!)}`}
    >
      <path d="M0 70h300" stroke="#d4d9d1" />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle
        cx="300"
        cy={65 - ((vals.at(-1)! - min) / span) * 50}
        r="3"
        fill="currentColor"
      />
    </svg>,
  );
}
export function Meter({ value, label }: { value: number; label?: string }) {
  return localize(
    <div
      className="meter"
      role="meter"
      aria-label={label ?? "Index"}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>,
  );
}
