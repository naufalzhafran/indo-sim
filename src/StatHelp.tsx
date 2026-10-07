import { useEffect, useLayoutEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { translate } from "./i18n";

export function StatHelp({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const tooltip = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const close = () => setPosition(null);
  const keep = () => clearTimeout(timer.current);
  const open = () => {
    keep();
    const rect = trigger.current!.getBoundingClientRect();
    setPosition({
      left: Math.max(12, Math.min(rect.left, innerWidth - 292)),
      top: Math.max(12, Math.min(rect.bottom + 8, innerHeight - 170)),
    });
  };
  const leave = () => {
    if (document.activeElement === trigger.current) return;
    timer.current = setTimeout(close, 120);
  };
  useLayoutEffect(() => {
    if (!position || !tooltip.current || !trigger.current) return;
    const anchor = trigger.current.getBoundingClientRect();
    const box = tooltip.current.getBoundingClientRect();
    const left = Math.max(
      12,
      Math.min(anchor.left, innerWidth - box.width - 12),
    );
    const below = anchor.bottom + 8;
    const top = Math.max(
      12,
      Math.min(
        below + box.height <= innerHeight - 12
          ? below
          : anchor.top - box.height - 8,
        innerHeight - box.height - 12,
      ),
    );
    if (left !== position.left || top !== position.top)
      setPosition({ left, top });
  }, [position, description]);
  useEffect(() => {
    if (!position) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
    };
    const scroll = () => {
      // Keyboard focus can scroll the panel after opening its hint.
      if (document.activeElement === trigger.current) open();
      else close();
    };
    document.addEventListener("keydown", escape, true);
    window.addEventListener("resize", close);
    document.addEventListener("scroll", scroll, true);
    return () => {
      document.removeEventListener("keydown", escape, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("scroll", scroll, true);
    };
  }, [position]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <>
      <span className="stat-label">
        {translate(label)}{" "}
        <button
          ref={trigger}
          type="button"
          className="stat-help"
          aria-label={`${translate(label)} ?`}
          aria-describedby={position ? id : undefined}
          onMouseEnter={open}
          onMouseLeave={leave}
          onFocus={open}
          onBlur={close}
          onClick={open}
        >
          <span aria-hidden="true">?</span>
        </button>
      </span>
      {position &&
        createPortal(
          <span
            ref={tooltip}
            id={id}
            role="tooltip"
            className="stat-tooltip"
            style={position}
            onMouseEnter={keep}
            onMouseLeave={leave}
          >
            {translate(description)}
          </span>,
          trigger.current?.closest("dialog") ?? document.body,
        )}
    </>
  );
}
