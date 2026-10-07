import {
  Children,
  cloneElement,
  isValidElement,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { indonesian } from "./locales/id";
import { GameSelect } from "./GameSelect";

export type Language = "en" | "id";
const storageKey = "indonesia-presidency-language";
let language: Language = "id";
try {
  const saved = localStorage.getItem(storageKey);
  if (saved === "en" || saved === "id") language = saved;
} catch {
  /* Language switching also works without browser storage. */
}
const listeners = new Set<() => void>();
export const getLanguage = () => language;
export const getLocale = () => (language === "id" ? "id-ID" : "en-US");
export function setLanguage(next: Language) {
  language = next;
  try {
    localStorage.setItem(storageKey, next);
  } catch {
    /* Keep the session preference. */
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = next;
    document.title =
      next === "id" ? "Indonesia / Ekonomi Wilayah" : "Indonesia / Regional Economy";
  }
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function useLanguage() {
  return useSyncExternalStore(subscribe, getLanguage, () => "id" as Language);
}
const normalize = (text: string) => text.replace(/\s+/g, " ").trim();
const caseInsensitive = new Map(
  Object.entries(indonesian).map(([key, value]) => [key.toLowerCase(), value]),
);
const templates = Object.entries(indonesian)
  .filter(([key]) => /\{\d+\}/.test(key))
  .sort(
    ([a], [b]) =>
      b.replace(/\{\d+\}/g, "").length - a.replace(/\{\d+\}/g, "").length,
  )
  .map(([key, value]) => ({
    pattern: new RegExp(
      "^" +
        key
          .split(/\{\d+\}/)
          .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join("(.+?)") +
        "$",
    ),
    value,
  }));

/** English messages stay in saves; translate only at the presentation boundary. */
export function translate(text: string, target: Language = language): string {
  if (target === "en" || !text.trim()) return text;
  const key = normalize(text);
  let result = Object.hasOwn(indonesian, key)
    ? indonesian[key]
    : caseInsensitive.get(key.toLowerCase());
  if (result === undefined) {
    for (const template of templates) {
      const match = template.pattern.exec(key);
      if (match) {
        result = template.value.replace(/\{(\d+)\}/g, (_, index: string) =>
          translate(match[Number(index) + 1], target),
        );
        break;
      }
    }
  }
  if (result === undefined) {
    // Policy summaries and map labels join independently translated names.
    const parts = text.split(/( · |; |: |, )/);
    if (parts.length > 1)
      return parts
        .map((part, i) => (i % 2 ? part : translate(part, target)))
        .join("");
    return text;
  }
  return (
    (text.match(/^\s*/)?.[0] ?? "") + result + (text.match(/\s*$/)?.[0] ?? "")
  );
}

/** The simulation stores ungrouped decimal numbers in its English event messages. */
export function translateReport(text: string): string {
  const translated = translate(text);
  return language === "id"
    ? translated.replace(/(\d)\.(?=\d)/g, "$1,")
    : translated;
}

/** Localize rendered copy, never identifiers, form values, handlers, or game data. */
export function localize(node: ReactNode): ReactNode {
  if (typeof node === "string") return translate(node);
  if (Array.isArray(node)) return Children.map(node, localize);
  if (!isValidElement<Record<string, unknown>>(node)) return node;
  const props: Record<string, unknown> = {};
  for (const key of ["title", "label", "aria-label", "placeholder", "alt"])
    if (typeof node.props[key] === "string")
      props[key] = translate(node.props[key]);
  if (node.props.children !== undefined)
    props.children = localize(node.props.children as ReactNode);
  return cloneElement(node, props);
}

export function LanguageSwitcher() {
  const current = useLanguage();
  return (
    <label className="language-switcher">
      <span>{current === "id" ? "Bahasa" : "Language"}</span>
      <GameSelect
        aria-label="Language / Bahasa"
        value={current}
        onChange={(e) => setLanguage(e.target.value as Language)}
      >
        <option value="en" lang="en">
          English
        </option>
        <option value="id" lang="id">
          Bahasa Indonesia
        </option>
      </GameSelect>
    </label>
  );
}
