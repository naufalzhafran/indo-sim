# National economy panel

Open **Economy / Ekonomi** in the game navigation. The economy opens in a full-size modal with a 16px viewport margin, rather than the map dossier.

The panel shows five population-weighted national foundations, changes since the last completed quarter, and thirteen industries. Selecting an industry shows its national output, jobs, quarter change, output-weighted readiness, foundation sensitivities, essential requirements, and the local constraint affecting the largest share of its output. Worker income, profits and investment describe the production feedback loop.

All values come from the current completed simulation state. Foundation weights are the existing catalog's game assumptions. The panel explains delayed workforce skills, essential-foundation limits, local differences, industry spillovers, and the role of demand and financing. It does not substitute national scores for local industry readiness.

## Design decisions

- Reading: island strategy game for desktop players; ENERGY 2 / RHYTHM 2 / MOTION 1.
- Color: established cream, teal and emerald preserve the approved island-game identity. The yellow explanation box is removed; emerald borders identify constraints.
- Typography: bundled Nunito makes headings and buttons friendly; Source Sans 3 keeps dense metrics legible.
- Layout: the requested full-size modal gives national management its own game board; the island world remains behind the backdrop. Foundations stay at the top, the industry inventory stays on the left, and production relationships stay on the right.
- Meters: foundation scores remain comparable on a fixed 0–100 scale.
- Input rows: five illustrated foundation nodes feed the industry through visible solid connectors, with essential and constraint roles written out.
- Focal point: the emerald industry tile uses a miniature world emblem and large output figure, with jobs, readiness and the current constraint below.
- Connectors: arrows describe inputs, income and investment feedback, rather than decorating buttons.
- Roster: thirteen raised inventory tiles have relevant miniature world emblems, output and employment; the emerald selection also has a visible check mark. The inventory scrolls independently and tile content has an explicit minimum height.
- Navigation: selection transfers focus to the active detail heading without scrolling the whole screen. The redundant Choose industry button is removed. Industry-support buttons trace finance, technology, logistics and manufacturing's agriculture connection.
- Foundations: a compact strip keeps scores, changes and meters visible. Selecting a score opens policies affecting that foundation.
- Policy effects: a dedicated tab shows the selected stat's direct policy effects first. Separate filters show support through the industry's current bottleneck and related policies in the player's draft. Cards identify affected stats, gain/decline direction, timing, and active/planned status using the existing catalog and actual game state. View policy opens its existing detail screen. These are mechanisms, not measured attribution of national changes.
- Radius and shadows: existing tactile controls and restrained bottom shadows distinguish buttons from the larger panel.
- Motion: no new animation loop or smooth scrolling; existing pressed and hover feedback respects the game's motion preferences.

## Verification

- `npm test`: 118 tests passed.
- `npm run build`: TypeScript and production build passed; existing large-bundle advisory remains.
- `tests/nationalEconomy.spec.ts`: six combinations of English/Indonesian and 1280×720, 1366×768, 1440×900 passed.
- Policy state integration test passed: active funding appears in the plan filter; View policy opens the matching detail; stopping funding and adding a different policy update their distinct statuses without advancing the quarter. Seven economy browser tests passed in total.
- Both Connections and Policy effects passed WCAG A/AA checks at all six language/viewport combinations. Foundation selection, policy timing, direct/bottleneck/plan filters and keyboard tab navigation passed.
- Each layout selects all thirteen industries, checks national output against province totals, verifies the full dependency chain and constraint are within the relationship viewport, runs WCAG A/AA axe checks, and checks browser errors.
- Opening campaign and completed-quarter states are exercised; completed-quarter imports update the panel.
- Previously recorded regression checks: export/import, WebGL fallback with regional selection and quarter progression, and map camera controls passed. This revision retested completed-quarter import and policy draft changes; world rendering and simulation rules were not modified.
- Rendered screenshots inspected against `docs/screenshots/world-construction-1440.png` and the user's current game reference.
- Desktop/laptop scope follows AGENTS.md; mobile-specific testing and layout changes are expressly excluded by the user's instructions.

### Recorded interaction checks

- Economy navigation opens the full-size native modal with background interaction blocked.
- All thirteen roster buttons select their industry, update the relationship values and show the selected state.
- Enter activates a focused roster button and moves focus to the relationship heading.
- Foundation score buttons open the relevant policy effects; left/right arrow keys switch detail tabs.
- Policy filters distinguish direct effects, bottleneck support and the current plan; the empty plan state remains explicit.
- Replanting shows an initial decline and later gain rather than presenting every impact as positive.
- Sensitivity and readiness help buttons use StatHelp; focus opens the explanation.
- Escape closes a tooltip first and keeps the panel open.
- Escape from the panel returns to the map and restores navigation focus.
- Return to map, header close, backdrop click and Escape close the modal and restore navigation focus.
- Shift+Tab from the first control wraps to the final control inside the modal; the optional focus trap applies to this modal only.
- Industry-support buttons select their corresponding industry and update its production chain.
- Choose policies opens the existing policy workspace.
- Importing a completed quarter updates foundation changes and industry quarter change.
- Verified policy screenshot: `docs/screenshots/national-economy/policy-effects-id-1280.png`.

## Anti Slop delivery gate

### Hard gate

- R-02 PASS: no em dash introduced in UI copy.
- R-03 PASS: six supported desktop/laptop layouts passed containment checks; mobile scope follows explicit project instructions.
- R-17 PASS: displayed values are simulation totals or existing catalog weights; weights are visibly identified as assumptions.
- R-18 PASS: no testimonials or people assets introduced.
- R-23 PASS: requested game-style UI uses the established art direction and actual simulation content; custom code-native emblems depict its foundations and industries, with no logo or portrait assets.
- R-24 PASS: Economy opens an implemented panel and Choose policies opens the existing workspace.
- R-25 PASS: axe WCAG A/AA checks passed for all six layouts, including selected roster controls.
- R-26 PASS: navigation, all industry choices, industry-support links, roster navigation, modal dismissal and policy shortcut have working handlers exercised in browser tests.
- R-27 PASS: loading and failed-save-read states have localized messages; opening campaign shows Opening instead of invented quarter changes.
- R-28 PASS: no FAQ added.
- R-32 PASS: keyboard Enter, focus transfer, two-stage Escape dismissal and modal focus wrapping passed.
- R-33 PASS: changes authored in TSX and CSS using direct patches; no source-rewriting scripts.
- R-34 PASS: the established single game theme is preserved.
- R-35 PASS: production build, six layout click-throughs and three regression scenarios passed; screenshots inspected.
- R-36 PASS: no external performance, security or compliance claims.
- R-37 PASS: explicit project palette, typography and island-game art direction used; design read recorded above.
- R-38 PASS: all metrics and dependency labels originate in simulation state/catalog; no fictional content introduced.

### Purpose gate

- R-01 PASS: existing game palette retained; yellow marks constraints and feedback information.
- R-04 PASS: custom solid SVG emblems depict books, transport, power, food, care, crops, boats, mines, businesses and money; their purpose is identifying the corresponding game statistic or industry.
- R-06 PASS: existing Nunito and Source Sans typography serves headings and dense metrics respectively.
- R-07 PASS: no ornamental grid or texture introduced.
- R-08 PASS: arrows depict production relationships; action buttons use plain labels.
- R-09 PASS: essential/supporting/constraint roles are functional textual labels, without decorative status badges.
- R-10 PASS: no glassmorphism introduced.
- R-12 PASS: short game-style shadows indicate the selected production tile and tactile controls.
- R-13 PASS: no glow introduced.
- R-14 PASS: matching roster tiles compare identical measures; input, production and outcome sections have distinct hierarchy.
- R-19 PASS: no new animated effects or continuous rendering.
- R-22 PASS: miniature world-object emblems connect the economy screen to the existing Indonesian island scenery; no stock illustrations added.

### Liveliness

- Dials PASS: ENERGY 2 / RHYTHM 2 / MOTION 1 declared and reflected in friendly type, changing section composition and hover/press feedback.
- Focal point PASS: the industry output tile anchors the dependency view.
- Whitespace PASS: section gaps separate foundations, production links, industry roster and policy action.
- Accent PASS: emerald selection and constraint borders identify the player's current context; the requested yellow notice is removed.
- Identity PASS: cream surfaces, emerald selections, rounded headings, miniature world emblems and raised inventory tiles match the island game.
- Design read PASS: declared before implementation and recorded above.

### Craftsmanship and quality locks

- C-1 / R-31 PASS: color, typography, layout, spacing, controls and connectors have written purposes above.
- C-2 PASS: each new control performs a tested action.
- C-3 PASS: sections directly satisfy the requested national stats and relationships.
- C-4 PASS: language, keyboard, opening/completed-quarter state and viewport checks passed.
- C-5 PASS: values reconcile with actual game state and assumptions are identified.
- R-05 PASS: content follows foundations → production → income/investment, with roster navigation; no landing-page template sections.
- R-11 PASS: compact input rows, tactile buttons and the larger production panel retain appropriate distinct radii.
- R-15 PASS: View policy, Choose policies and Return to map name specific actions.
- R-16 PASS: no marketing buzzwords introduced.
- R-20 PASS: matches the established Indonesian island-game identity.
- R-21 PASS: the approved bright game theme is preserved as explicitly required.
- R-29 PASS: established shared game colors reused; no competing theme.
- R-30 PASS: the existing game's design is extended, with no external product imitation.
