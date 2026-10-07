import { EconomyEmblem } from "./EconomyEmblem";
import type { Foundation, IndustryId } from "./engine/economy/types";

export function PolicyIllustration({
  kind,
  building = false,
}: {
  kind: Foundation | IndustryId;
  building?: boolean;
}) {
  return (
    <div className="eco-policy-picture" aria-hidden="true">
      <svg viewBox="0 0 200 118" className="eco-policy-islet" fill="none">
        <ellipse cx="101" cy="91" rx="91" ry="22" fill="#91dbd6" />
        <path d="m20 79 61-28 99 25-25 28-64 9-69-21Z" fill="#eacb88" />
        <path d="m26 73 57-27 91 25-24 26-59 8-64-21Z" fill="#579668" />
        <path d="m26 73 57-27 91 25-68 21Z" fill="#7cae69" />
        <path d="m106 72 37 9-10 12-40-10Z" fill="#fffaf0" />
        <path d="m32 77 20-14 21 9-20 14Z" fill="#b9cc86" />
        <path
          d="M48 72v11m-8-12 8-22 11 22Z"
          fill="#247c5e"
          stroke="#244d49"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M157 73v13m-9-13 9-23 11 23Z"
          fill="#247c5e"
          stroke="#244d49"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {building ? (
          <g stroke="#244d49" strokeWidth="2" strokeLinejoin="round">
            <path d="M124 29v49m-23-45h62l-39-12Z" fill="#f6d77e" />
            <path d="m120 77 8-39m-8 6 8 12m-8 6 8 12m26-41v21" />
            <path d="m144 57 10-6 9 5v12l-9 5-10-5Z" fill="#eb7057" />
          </g>
        ) : (
          <g>
            <path d="M121 49h22v23l-22 6Z" fill="#fffaf0" />
            <path d="m117 49 17-13 14 9-5 4Z" fill="#eb7057" />
            <path d="M130 59v15" stroke="#244d49" strokeWidth="5" />
          </g>
        )}
      </svg>
      <EconomyEmblem kind={kind} />
    </div>
  );
}
