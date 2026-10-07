import type { Foundation, IndustryId } from "./engine/economy/types";

// Solid, miniature world objects tie economy controls to the island scenery.
export function EconomyEmblem({
  kind,
}: {
  kind:
    | Foundation
    | IndustryId
    | "income"
    | "profits"
    | "investment"
    | "trade"
    | "excise"
    | "luxury";
}) {
  let drawing;
  switch (kind) {
    case "trade":
      drawing = (
        <>
          <path d="M9 35h46l-9 16H20Z" fill="#fffaf0" />
          <path d="M19 24h13v11H19Zm15 0h13v11H34Z" fill="#f6d77e" />
          <path d="M21 13h24v11H21Z" fill="#eb7057" />
          <path d="M9 56q5-5 10 0t10 0 10 0 10 0 7 0" stroke="#247c5e" />
        </>
      );
      break;
    case "excise":
      drawing = (
        <>
          <path d="M23 15h10v12l6 9v18H17V36l6-9Z" fill="#247c5e" />
          <path d="M22 9h12v6H22Z" fill="#f6d77e" />
          <path d="M19 37h18v12H19Z" fill="#fffaf0" />
          <path d="M44 25h8v29h-8Z" fill="#fffaf0" />
          <path d="M44 47h8v7h-8Z" fill="#eb7057" />
          <path d="M48 19q-6-4 0-8" stroke="#5a7069" />
        </>
      );
      break;
    case "luxury":
      drawing = (
        <>
          <path d="m14 32 7-14h24l7 14 5 5v12H7V37Z" fill="#eb7057" />
          <path d="m20 30 5-9h16l5 9Z" fill="#fffaf0" />
          <circle cx="18" cy="49" r="6" fill="#244d49" />
          <circle cx="46" cy="49" r="6" fill="#244d49" />
          <path d="M11 39h7m28 0h7M31 21v9" stroke="#fffaf0" />
        </>
      );
      break;
    case "education":
      drawing = (
        <>
          <path d="M12 19 32 24 52 19v30l-20 5-20-5Z" fill="#fffaf0" />
          <path d="m32 24 0 30M18 28l8 2m-8 7 8 2m12-9 8-2m-8 11 8-2" />
          <path d="m14 12 18-5 18 5-18 6Z" fill="#247c5e" />
        </>
      );
      break;
    case "infrastructure":
    case "logistics":
      drawing = (
        <>
          <path d="M8 43h48v8H8Z" fill="#fffaf0" />
          <path d="M15 46V19h6v27m22 0V19h6v27" fill="#eb7057" />
          <path d="M18 20q14 27 28 0M10 36h44M25 30v13m14-13v13" />
          <path d="M12 54h10m7 0h10m7 0h7" stroke="#247c5e" />
        </>
      );
      break;
    case "energy":
      drawing = <path d="m36 7-20 29h14l-4 22 23-31H34Z" fill="#f6d77e" />;
      break;
    case "food":
      drawing = (
        <>
          <path d="M11 34h42q-3 19-21 19T11 34Z" fill="#eb7057" />
          <path d="M15 31q1-13 11-8 6-17 15-3 12-2 10 11Z" fill="#fffaf0" />
          <path d="M28 14v-6m11 6 4-6" />
        </>
      );
      break;
    case "health":
    case "publicServices":
      drawing = (
        <>
          <path d="M13 21h38v32H13Z" fill="#fffaf0" />
          <path d="M9 21 32 9l23 12Z" fill="#247c5e" />
          <path
            d="M28 25h8v7h7v8h-7v7h-8v-7h-7v-8h7Z"
            fill="#eb7057"
            stroke="none"
          />
        </>
      );
      break;
    case "agriculture":
    case "palmOil":
      drawing = (
        <>
          <path d="M32 54V25" strokeWidth="5" />
          <path d="M32 30Q6 30 14 12q16-1 18 18Z" fill="#247c5e" />
          <path
            d="M32 23Q31 1 47 9q7 14-15 14Zm0 18q0-22 22-15 1 18-22 15Z"
            fill="#74a45d"
          />
          <path d="M13 54h38" stroke="#247c5e" />
          {kind === "palmOil" && (
            <>
              <circle cx="25" cy="33" r="5" fill="#eb7057" />
              <circle cx="33" cy="35" r="5" fill="#eb7057" />
            </>
          )}
        </>
      );
      break;
    case "fishing":
      drawing = (
        <>
          <path d="M10 40h44l-9 13H20Z" fill="#eb7057" />
          <path d="M29 39V9l19 25H29Z" fill="#fffaf0" />
          <path d="M13 57h38" stroke="#247c5e" />
          <path d="M24 11 12 32h12Z" fill="#f6d77e" />
        </>
      );
      break;
    case "mining":
      drawing = (
        <>
          <path d="m9 53 16-33 12 14 9-20 12 39Z" fill="#74a45d" />
          <path
            d="m28 12 21 27m-17-24q10-7 20 1"
            strokeWidth="6"
            stroke="#eb7057"
          />
          <path d="m24 20 4 7m18-10 4 13" stroke="#fffaf0" />
        </>
      );
      break;
    case "manufacturing":
    case "construction":
      drawing = (
        <>
          <path d="M12 29 25 20v10l13-10v10h14v24H12Z" fill="#fffaf0" />
          <path d="M43 29V11h8v18" fill="#eb7057" />
          <path d="M20 39h5m8 0h5m7 0h3M28 54V44h10v10" />
          <path d="M46 6h8" stroke="#5a7069" />
        </>
      );
      break;
    case "retail":
      drawing = (
        <>
          <path d="M13 27h38v27H13Z" fill="#fffaf0" />
          <path d="M9 27 16 13h32l7 14Z" fill="#eb7057" />
          <path d="M21 16v11m11-11v11m11-11v11" stroke="#fffaf0" />
          <path d="M19 37h12v10H19Zm19 17V35h9v19" fill="#f6d77e" />
        </>
      );
      break;
    case "tourism":
      drawing = (
        <>
          <path d="M12 23h40v31H12Z" fill="#fffaf0" />
          <path d="m8 23 24-14 24 14Z" fill="#eb7057" />
          <path d="M20 32h5m14 0h5m-24 8h5m14 0h5M28 54V42h8v12" />
          <path d="M29 8V3h14" stroke="#247c5e" />
        </>
      );
      break;
    case "finance":
      drawing = (
        <>
          <path d="m8 21 24-13 24 13ZM10 51h44v6H10Z" fill="#f6d77e" />
          <path
            d="M16 25v23m16-23v23m16-23v23"
            strokeWidth="6"
            stroke="#247c5e"
          />
        </>
      );
      break;
    case "technology":
      drawing = (
        <>
          <path d="M13 12h38v30H13Z" fill="#247c5e" />
          <path d="M18 17h28v20H18Z" fill="#fffaf0" />
          <path d="m26 22-5 5 5 5m12-10 5 5-5 5" stroke="#eb7057" />
          <path d="M29 42v8h6v-8M19 53h26" />
        </>
      );
      break;
    case "services":
      drawing = (
        <>
          <path d="M18 10h28v44H18Z" fill="#fffaf0" />
          <path
            d="M25 18h3m9 0h3m-15 9h3m9 0h3m-15 9h3m9 0h3M29 54V44h6v10"
            stroke="#247c5e"
          />
          <path d="M13 54h38" />
        </>
      );
      break;
    case "income":
      drawing = (
        <>
          <circle cx="25" cy="21" r="9" fill="#f6d77e" />
          <path d="M10 49q0-18 15-18t15 18Z" fill="#247c5e" />
          <circle cx="47" cy="44" r="11" fill="#f6d77e" />
          <path d="M47 38v12m-4-9h7m-7 6h7" />
        </>
      );
      break;
    case "profits":
      drawing = (
        <>
          <path d="M11 36h24v8H11Zm0 9h24v8H11Z" fill="#f6d77e" />
          <circle cx="43" cy="28" r="16" fill="#f6d77e" />
          <path d="M43 18v20m-6-16h9q5 6-4 6t-4 6h10" />
        </>
      );
      break;
    case "investment":
      drawing = (
        <>
          <path d="M10 28h44v27H10Z" fill="#f6d77e" />
          <path d="m10 28 22-12 22 12-22 11ZM32 39v16" fill="#fffaf0" />
          <path d="M32 4v18m-8-9 8-9 8 9" stroke="#247c5e" strokeWidth="4" />
        </>
      );
  }
  return (
    <svg
      className="economy-emblem"
      viewBox="0 0 64 64"
      aria-hidden="true"
      fill="none"
      stroke="#244d49"
      strokeWidth="2.5"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {drawing}
    </svg>
  );
}
