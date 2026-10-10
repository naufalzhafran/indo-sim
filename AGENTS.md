# Game purpose: education first

- This is an educational game. Its job is to help ordinary Indonesians, including first-time players with no economics background, understand how economic and political decisions work and how they affect the country and individual families. The user set this direction on 2026-10-10. Apply it to every feature, balance change, text and screen.
- Learning comes before winning. Design goals, results and feedback so players understand why something happened, not only whether they scored. A missed goal should explain its cause and what usually helps, in plain words, never just a red mark or a grade.
- Do not add competitive features such as leaderboards, high scores, rankings against other players, speed runs, timers or streaks. Keep the six mandate goals and the optional objectives as learning targets that frame decisions, not as a score to beat. Prefer neutral wording such as "Not reached" over "Failed" or "Lost".
- Keep it easy for beginners. A new player must be able to start, make sensible first choices, advance a quarter and understand the result without reading documentation. Introduce systems gradually, explain jargon (GDP, deficit, APBN, percentage points) in plain language through `StatHelp`, and keep the next step obvious on the map.
- Teach true cause and effect. Numbers may be simplified ("arcade numbers"), but the direction of every effect must match Indonesia. Pair simplified mechanics with a short, sourced "In reality" fact where it helps, and label game assumptions as assumptions.
- Stay balanced and non-partisan. Present parties, programmes and policies fairly, show both benefits and costs of every option, and do not reward or punish a political side. No option should be an obvious best answer, and doing nothing should drift rather than collapse.
- Write for the player, not the developer. Use short sentences in English and Bahasa Indonesia, and avoid internal terms. Check new text with a first-time player in mind.

# Project UI rules

## Supported devices

- Target desktop and laptop screens. Phone and mobile layouts are not required.
- Do not add mobile-specific layouts or require phone/mobile testing unless the user explicitly requests mobile support.
- Check responsiveness and viewport containment at supported desktop and laptop sizes, including 1280×720, 1366×768, and 1440×900.

## Preserve the approved design

- The user approved the cheerful UI and low-poly Indonesian island world on 2026-10-05. This is the established art direction for the entire game and every future feature.
- Extend this style; do not replace, reinterpret, or redesign it during feature work, fixes, or refactoring. Change the art direction only when the user explicitly requests it. Accessibility, responsiveness, and performance fixes must preserve the visual identity.
- Use `src/QuarterApp.tsx`, `src/quarter.css`, and `src/world.css` as the UI reference, and `src/WorldScene.tsx` and `src/mapGeometry.ts` as the 3D reference. The approved appearance is also recorded in `docs/screenshots/world-construction-1440.png`. Older screens and legacy styles are not a reason to restore the previous appearance.

## Cheerful game UI

- Keep the friendly island-game character: warm cream surfaces, deep teal text, emerald selections, and coral primary actions. Avoid returning to the dark, brown, serif-heavy administrative dashboard style.
- Reuse the existing `--q-*` tokens in `src/quarter.css`: ink `#244d49`, green `#247c5e`, coral `#eb7057`, cream `#fffaf0`, line `#d6e4d8`, and muted text `#5a7069`. Extend shared styles rather than introducing a competing palette or component theme.
- Use bundled Nunito for rounded, bold headings and controls, and Source Sans 3 for body text, metrics, and dense information. Preserve readable hierarchy and tabular numbers.
- Follow the existing rounded controls, panels, and dialogs. Use short bottom shadows and restrained pressed feedback to make controls feel tactile; keep radius and elevation appropriate to each component rather than making everything a pill.
- Reserve coral for important primary actions such as advancing a quarter; preserve its dark text for contrast. Use emerald with light text for selected states. Keep game information and consequences clear even when the surrounding presentation is playful.
- Keep the archipelago the main visual focus. Use compact stat strips, map controls, and brief prompts; put larger workflows in the existing dedicated panels or dialogs. Do not cover the islands with oversized permanent overlays or add decorative dashboard clutter.
- Apply this style to every new screen, empty/loading/error state, dialog, dropdown panel, and tooltip. Use existing components and localization patterns rather than creating visually unrelated controls.

## Low-poly Indonesian island world

- Indonesia's islands are the only playable, terrain-detailed land. The 3D map also shows the ASEAN members plus Papua New Guinea as flat, untextured grey background land (`NeighbourLand` in `src/WorldScene.tsx`, `neighbourGeometry` in `src/mapGeometry.ts`, loaded from `public/data/region.geojson`). The user requested this on 2026-10-05; keep it. Neighbours stay flat, grey, unselectable and without terrain, trees, houses or labels. Do not add other countries (e.g. Australia, China, India) or other continental land.
- Keep 3D as the default presentation, without a normal 2D/3D switch. Preserve the automatic fallback and retry path for devices where WebGL is unavailable.
- Preserve recognizable coastlines and separate islands. The player selects nine regions: Sumatra, Java, Bali, Kalimantan, Sulawesi, NTB, NTT, Maluku, and Papua. Keep all 38 provinces underneath for simulation and geography; clicking any province selects its containing region. Stylization must not break regional selection, data layers, construction markers, crisis markers, or camera controls.
- Maintain the bright turquoise ocean, shallow-water shelf, sandy coast edges, thick green island plateaus, deliberate faceted mountains, clustered low-poly trees, tiny houses, and small boats.
- Keep shared province boundaries aligned. Build sand and shallow-water shelves around merged island coastlines, never around internal province borders.
- Use simple geometric forms, flat shading, sunny lighting, and soft restrained shadows. Avoid photorealism, dark or muddy colors, jagged per-triangle terrain spikes, noisy textures, and unrelated ornamental scenery. Terrain and decorative scenery remain illustrative, not measured elevation or actual project data.
- Preserve the centered orthographic tabletop view and enough open water to frame the archipelago. Keep the islands visible around the UI at supported viewport sizes.
- Reuse geometry/materials and instancing where appropriate, preserve demand rendering and cached static shadows, and respect reduced-motion settings. New scenery must not introduce unnecessary continuous rendering or degrade interaction and quarter-animation performance.

## Verify visual consistency

- For UI or scene changes, inspect the rendered result against the approved reference, including the changed interactions and states. A successful build alone does not verify appearance.
- Check English and Indonesian layouts at supported desktop and laptop widths, text contrast, keyboard focus, custom dropdown containment, and tooltip/dialog dismissal. Prevent clipped labels, horizontal overflow, and overlapping controls; retain comfortably sized controls.
- Run checks appropriate to the changed behavior. Preserve map interactions, save/load, quarter progression, reduced motion, and WebGL fallback when touching their UI or rendering paths.

## No accordions

- Do not use accordions or expandable/collapsible content sections anywhere in the game UI. This applies to every screen, panel, dialog, and future feature, not only Wilayah.
- Do not use HTML `<details>` / `<summary>`, accordion libraries, or custom disclosure toggles that expand and collapse content in place.
- Keep essential information visible in compact summaries, stat strips, or clearly labeled sections. Use tabs, filter buttons, or explicit navigation to a dedicated detail view for larger sets of information.
- Use the existing `StatHelp` pattern below for short explanations. Do not hide information required to make a decision behind a tooltip.
- Preserve this rule when creating, editing, or refactoring UI. When revising an existing accordion, replace it with one of these alternatives rather than restyling it.
- Audit custom show-more/show-less controls as well as native disclosures. For list subsets, use explicitly labeled filter buttons with a visible selected state rather than a single expand/collapse toggle. Dropdown option panels and hint tooltips remain supported by the rules below.

## Game briefings, not generic notice banners

- Do not put ordinary explanations, disclaimers, onboarding reminders, or rules inside yellow rounded callout boxes or generic web-style notice banners anywhere in the game.
- Integrate essential rules and consequences into the relevant briefing, objective, checklist row, or action review using plain text and clear hierarchy. Remove redundant explanatory filler.
- Present optional challenges as named game objectives with a short condition, not as a disclaimer paragraph.
- Preserve the approved palette and island-world identity. Yellow may support an actual gameplay action or meaningful status, but must not become a default background for explanatory paragraphs.
- Keep genuine errors and consequential warnings visible beside the affected action, with specific wording and accessible status semantics. Do not rely on color alone or hide decision-critical information in a tooltip.

## No link-style clickable controls

- Do not style clickable actions or navigation as plain text links, underlined labels, or borderless text-only controls anywhere in the game UI.
- Use visibly bounded buttons, tabs, or selectable cards with the established cream surfaces, rounded borders, short shadows, and clear hover, pressed, disabled, and keyboard-focus states.
- Keep actual external links semantic anchors, but give them a visible button treatment. This also applies to source and map-attribution links.
- Labels and descriptions remain plain, non-clickable text. Short hints continue to use the separate circled `?` button in `StatHelp`.

## Dropdowns

- Use the in-game custom dropdown panel for every dropdown. Reuse `src/GameSelect.tsx`.
- Do not render native HTML `<select>` controls or use browser/OS-native dropdown UI.
- `<option>` elements passed to `GameSelect` are allowed as option data; they must not render as native controls.
- Preserve keyboard navigation, visible focus, disabled options, and viewport containment.

## Hints and descriptions

- Use `src/StatHelp.tsx` for tooltips explaining stats, controls, or other UI labels.
- Keep the label as plain text, with a separate small circled `?` button beside it. Do not underline the label or make the label itself a tooltip trigger.
- Open the tooltip only from the `?` button, on hover or keyboard focus. Keep the button accessible with a descriptive name and associate it with the tooltip.
- Escape dismisses the tooltip before any containing dialog. Users must be able to move the pointer onto the tooltip to read it.
- Keep tooltips inside the viewport and visible above their containing panel or dialog. Do not use native `title` tooltips for these hints.
- Provide English and Indonesian descriptions using the existing localization system.
