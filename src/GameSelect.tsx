import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type Option = {
  value: string | number;
  children: ReactNode;
  disabled?: boolean;
  lang?: string;
};
type Props = {
  value: string | number;
  onChange: (event: { target: { value: string } }) => void;
  children: ReactNode;
  disabled?: boolean;
  "aria-label"?: string;
};

/** A select-only combobox; option JSX supplies data, never native controls. */
export function GameSelect({
  value,
  onChange,
  children,
  disabled,
  "aria-label": label,
}: Props) {
  const options = Children.toArray(children)
    .filter(isValidElement<Option>)
    .map((child) => child.props);
  const selected = options.findIndex(
    (option) => String(option.value) === String(value),
  );
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(selected);
  const [position, setPosition] = useState({
    left: 0,
    top: 0,
    width: 0,
    maxHeight: 300,
  });
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const anchor = useRef({ top: 0, left: 0 });
  const search = useRef({ text: "", time: 0 });
  const keyboardNavigation = useRef(true);
  const id = useId();
  const close = () => setOpen(false);
  const show = () => {
    keyboardNavigation.current = true;
    setActive(
      selected >= 0 && !options[selected].disabled
        ? selected
        : options.findIndex((option) => !option.disabled),
    );
    setOpen(true);
  };
  const choose = (index: number) => {
    if (!options[index] || options[index].disabled) return;
    onChange({ target: { value: String(options[index].value) } });
    close();
    trigger.current?.focus({ preventScroll: true });
  };
  useLayoutEffect(() => {
    if (!open || !trigger.current) return;
    const rect = trigger.current.getBoundingClientRect();
    anchor.current = { top: rect.top, left: rect.left };
    const below = innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const upward = below < 220 && above > below;
    const maxHeight = Math.min(320, upward ? above : below);
    const width = Math.min(Math.max(rect.width, 240), innerWidth - 24);
    setPosition({
      left: Math.min(rect.left, innerWidth - width - 12),
      top: upward ? rect.top - 6 : rect.bottom + 6,
      width,
      maxHeight,
    });
    panel.current?.setAttribute("data-upward", String(upward));
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (
        !trigger.current?.contains(event.target as Node) &&
        !panel.current?.contains(event.target as Node)
      )
        close();
    };
    const scroll = (event: Event) => {
      if (panel.current?.contains(event.target as Node)) return;
      const rect = trigger.current?.getBoundingClientRect();
      if (
        !rect ||
        rect.top !== anchor.current.top ||
        rect.left !== anchor.current.left
      )
        close();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);
  useEffect(() => {
    const list = panel.current;
    const option = list?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    if (!open || !list || !option || !keyboardNavigation.current) return;
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
    else if (
      option.offsetTop + option.offsetHeight >
      list.scrollTop + list.clientHeight
    )
      list.scrollTop =
        option.offsetTop + option.offsetHeight - list.clientHeight;
  }, [open, active]);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="game-select"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-activedescendant={
          open && active >= 0 ? `${id}-${active}` : undefined
        }
        value={value}
        disabled={disabled}
        onClick={() => (open ? close() : show())}
        onBlur={close}
        onKeyDown={(event) => {
          keyboardNavigation.current = true;
          if (event.key === "Escape" && open) {
            event.preventDefault();
            event.stopPropagation();
            close();
            return;
          }
          if (event.key === "Tab") {
            close();
            return;
          }
          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            if (!open) {
              show();
              return;
            }
            const direction =
              event.key === "ArrowUp" || event.key === "End" ? -1 : 1;
            let next =
              event.key === "Home"
                ? -1
                : event.key === "End"
                  ? options.length
                  : active;
            do {
              next += direction;
            } while (
              next >= 0 &&
              next < options.length &&
              options[next].disabled
            );
            if (next >= 0 && next < options.length) setActive(next);
          } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (open) choose(active);
            else show();
          } else if (
            event.key.length === 1 &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey
          ) {
            event.preventDefault();
            const text =
              (Date.now() - search.current.time < 700
                ? search.current.text
                : "") + event.key.toLocaleLowerCase();
            search.current = { text, time: Date.now() };
            if (!open) show();
            const match = options.findIndex(
              (option) =>
                !option.disabled &&
                Children.toArray(option.children)
                  .join("")
                  .toLocaleLowerCase()
                  .startsWith(text),
            );
            if (match >= 0) setActive(match);
          }
        }}
      >
        <span>{options[selected]?.children ?? options[0]?.children}</span>
        <span className="select-chevron" aria-hidden="true">
          ⌄
        </span>
      </button>
      {open &&
        createPortal(
          <div
            ref={panel}
            id={id}
            role="listbox"
            aria-label={label}
            className="game-select-panel"
            style={position}
            onPointerDown={(event) => event.preventDefault()}
          >
            {options.map((option, index) => (
              <div
                key={String(option.value)}
                id={`${id}-${index}`}
                role="option"
                aria-selected={index === selected}
                aria-disabled={option.disabled || undefined}
                lang={option.lang}
                data-value={String(option.value)}
                data-index={index}
                data-active={index === active}
                onPointerMove={() => {
                  keyboardNavigation.current = false;
                  if (!option.disabled) setActive(index);
                }}
                onClick={() => choose(index)}
              >
                <span>{option.children}</span>
                <span aria-hidden="true">{index === selected ? "✓" : ""}</span>
              </div>
            ))}
          </div>,
          trigger.current?.closest("dialog") ?? document.body,
        )}
    </>
  );
}
