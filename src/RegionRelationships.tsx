import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { StatHelp } from "./StatHelp";
import { EconomyEmblem } from "./EconomyEmblem";
import { money, number } from "./components";
import { useLanguage } from "./i18n";
import { regionForProvince } from "./engine/gameRegions";
import {
  foundationNames,
  industries,
  industryById,
  policies,
} from "./engine/economy/catalog";
import { taxDefinitions } from "./engine/taxes";
import { policyAllocations } from "./engine/economy/engine";
import {
  FOUNDATIONS,
  type QuarterGame,
  type QuarterPlan,
  type PolicyId,
  type RegionId,
} from "./engine/economy/types";

type Edge = {
  from: string;
  to: string;
  indirect?: boolean;
  negative?: boolean;
  weight: number;
};
type GraphNode = {
  id: string;
  label: string;
  detail: string;
  explanation: string;
  emblem?: Parameters<typeof EconomyEmblem>[0]["kind"];
};
type Path = Edge & { d: string };

export function RegionRelationships({
  game,
  plan,
  regionId,
  onPolicy,
}: {
  game: QuarterGame;
  plan: QuarterPlan;
  regionId: RegionId;
  onPolicy: (id: PolicyId) => void;
}) {
  const language = useLanguage();
  const t = (en: string, id: string) => (language === "en" ? en : id);
  const activePolicies = policies.filter((item) =>
    game.policies.some((runtime) => runtime.id === item.id && runtime.active),
  );
  const projects = game.simulation.projects.filter(
    (project) => regionForProvince(project.province)?.id === regionId,
  );
  const report = game.receipt?.regionsAfter.find((r) => r.id === regionId);
  const graphPolicies = policies.filter(
    (policy) =>
      activePolicies.includes(policy) ||
      plan.policies.includes(policy.id) ||
      (report?.policySpending[policy.id] ?? 0) > 0 ||
      projects.some((project) => project.id === `${policy.id}:${regionId}`),
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [paths, setPaths] = useState<Path[]>([]);
  const diagram = useRef<HTMLDivElement>(null);
  const members = game.simulation.provinces.filter(
    (p) => regionForProvince(p.id)?.id === regionId,
  );
  const total = (read: (p: (typeof members)[number]) => number) =>
    members.reduce((sum, p) => sum + read(p), 0);
  const perIndustry = industries.map((item) => {
    const output = total((p) => p.industries[item.id].output);
    return {
      item,
      output,
      jobs: total((p) => p.industries[item.id].jobs),
      income: total((p) => p.industries[item.id].laborIncome),
      profits: total((p) => p.industries[item.id].profits),
      imports: output * item.importShare * 0.18,
    };
  });
  const sum = (read: (row: (typeof perIndustry)[number]) => number) =>
    perIndustry.reduce((acc, row) => acc + read(row), 0);
  const output = sum((r) => r.output);
  const jobs = sum((r) => r.jobs);
  const income = sum((r) => r.income);
  const profits = sum((r) => r.profits);
  const imports = sum((r) => r.imports);
  const consumption = total((p) => p.consumption);
  // Edge weight is 0-1 and drives line width: a share of the largest sibling,
  // or of last-quarter receipts where those exist.
  const clamp = (value: number) => Math.min(1, Math.max(0.12, value));
  const share = (part: number, whole: number) =>
    whole > 0 ? clamp(part / whole) : 0.5;
  const maxOf = (read: (row: (typeof perIndustry)[number]) => number) =>
    Math.max(...perIndustry.map(read));
  const maxFoundation = Math.max(
    ...industries.flatMap((item) => FOUNDATIONS.map((f) => item.weights[f])),
  );
  const consumptionTaxIds = ["vat", "excise", "luxury", "importDuty"] as const;
  const consumptionTaxTotal = report
    ? consumptionTaxIds.reduce((acc, id) => acc + report.taxes[id], 0)
    : 0;
  const taxTotal = report
    ? taxDefinitions.reduce((acc, tax) => acc + report.taxes[tax.id], 0)
    : 0;
  const industryIds = new Set<string>(industries.map((item) => item.id));
  const edges: Edge[] = [
    ...graphPolicies.flatMap((policy) => [
      ...(policy.effects.collection
        ? taxDefinitions.map((tax) => ({
            from: `policy:${policy.id}`,
            to: tax.id,
            weight: report ? share(report.taxes[tax.id], taxTotal) : 0.5,
          }))
        : []),
      ...(policy.effects.transfers
        ? [
            {
              from: `policy:${policy.id}`,
              to: "consumption",
              indirect: true,
              weight: 0.4,
            },
          ]
        : []),
      ...policy.impacts
        .filter(
          (impact) =>
            FOUNDATIONS.includes(
              impact.target as (typeof FOUNDATIONS)[number],
            ) || industryIds.has(impact.target),
        )
        .map((impact) => ({
          from: `policy:${policy.id}`,
          to: industryIds.has(impact.target)
            ? `industry:${impact.target}`
            : impact.target,
          negative: impact.direction === "down",
          weight: 0.6,
        })),
    ]),
    ...perIndustry.flatMap((row) => {
      const id = `industry:${row.item.id}`;
      return [
        ...FOUNDATIONS.filter((f) => row.item.weights[f] > 0).map((f) => ({
          from: f,
          to: id,
          weight: share(row.item.weights[f], maxFoundation),
        })),
        {
          from: id,
          to: "output",
          weight: share(
            row.output,
            maxOf((r) => r.output),
          ),
        },
        {
          from: id,
          to: "jobs",
          weight: share(
            row.jobs,
            maxOf((r) => r.jobs),
          ),
        },
        {
          from: id,
          to: "income",
          weight: share(
            row.income,
            maxOf((r) => r.income),
          ),
        },
        ...(row.item.id !== "publicServices"
          ? [
              {
                from: id,
                to: "profits",
                weight: share(
                  row.profits,
                  maxOf((r) => r.profits),
                ),
              },
            ]
          : []),
        {
          from: id,
          to: "imports",
          indirect: true,
          weight: share(
            row.imports,
            maxOf((r) => r.imports),
          ),
        },
      ];
    }),
    { from: "jobs", to: "income", weight: 1 },
    { from: "output", to: "income", weight: share(income, output) },
    { from: "output", to: "profits", weight: share(profits, output) },
    { from: "income", to: "personalIncome", weight: 1 },
    { from: "income", to: "consumption", indirect: true, weight: 0.5 },
    { from: "profits", to: "corporateIncome", weight: 1 },
    ...consumptionTaxIds.map((to) => ({
      from: "consumption",
      to,
      weight: report ? share(report.taxes[to], consumptionTaxTotal) : 0.5,
    })),
    { from: "imports", to: "importDuty", weight: 0.5 },
  ];
  const rows: {
    kind: string;
    compact?: boolean;
    nodes: GraphNode[];
  }[] = [
    {
      kind: "policies",
      nodes: graphPolicies.map((policy) => ({
        id: `policy:${policy.id}`,
        label: policy.name,
        detail: "",
        explanation: `${policy.purpose[language]} ${policy.mechanism[language]}`,
      })),
    },
    {
      kind: "foundations",
      nodes: FOUNDATIONS.map((f) => ({
        id: f,
        emblem: f,
        label: foundationNames[f][language],
        detail: t("Foundation", "Fondasi"),
        explanation: t(
          `${foundationNames[f].en} sets industry potential. Each industry has its own sensitivity to it; these are simulation weights, not guaranteed growth.`,
          `${foundationNames[f].id} membentuk potensi industri. Setiap industri punya kepekaan sendiri; ini bobot simulasi, bukan jaminan pertumbuhan.`,
        ),
      })),
    },
    {
      kind: "industries",
      compact: true,
      nodes: industries.map((item) => ({
        id: `industry:${item.id}`,
        emblem: item.id,
        label: item.name[language],
        detail: "",
        explanation: t(
          "Foundations shape industry potential. Demand, investment, available workers and taxes also affect actual output.",
          "Fondasi membentuk potensi industri. Permintaan, investasi, ketersediaan pekerja, dan pajak juga memengaruhi output aktual.",
        ),
      })),
    },
    {
      kind: "outcomes",
      nodes: [
        {
          id: "output",
          emblem: "manufacturing",
          label: t("Value added", "Nilai tambah"),
          detail: money(output),
          explanation: t(
            "Annual industry value added contributes to regional GDP. Each industry's labor share sets its wage-budget ceiling; filled jobs determine actual earnings. Private value added remaining after wages and modeled costs becomes business profit. Earnings and profits feed their respective taxes; GDP itself is not a tax base.",
            "Nilai tambah tahunan industri berkontribusi pada PDRB wilayah. Porsi tenaga kerja tiap industri menetapkan batas anggaran upah; pekerjaan terisi menentukan penghasilan aktual. Sisa nilai tambah swasta setelah upah dan biaya model menjadi laba usaha. Penghasilan dan laba menjadi dasar pajak masing-masing; PDRB sendiri bukan dasar pajak.",
          ),
        },
        {
          id: "jobs",
          emblem: "services",
          label: t("Jobs", "Pekerjaan"),
          detail: `${number(jobs, 2)} ${t("million", "juta")}`,
          explanation: t(
            "Filled jobs earn wages and contribute to worker income, within each industry's wage budget. Unemployment also depends on the region's labor force.",
            "Pekerjaan yang terisi menghasilkan upah dan pendapatan pekerja, sesuai batas anggaran upah tiap industri. Pengangguran juga bergantung pada angkatan kerja wilayah.",
          ),
        },
        {
          id: "income",
          emblem: "income",
          label: t("Worker income", "Pendapatan pekerja"),
          detail: money(income),
          explanation: t(
            "Total annual earnings equal filled jobs times an annual wage that follows growth and skills, capped by industry output times its labor share. Earnings feed personal income tax in the next monthly collection. Policy transfers are excluded from taxable wages. Take-home income also supports consumption.",
            "Total penghasilan tahunan dihitung dari pekerjaan terisi dikali upah tahunan yang mengikuti pertumbuhan dan keterampilan, dibatasi output industri dikali porsi tenaga kerja. Penghasilan menjadi dasar PPh pribadi pada pemungutan bulanan berikutnya. Bantuan kebijakan tidak termasuk upah kena pajak. Pendapatan bersih juga mendukung konsumsi.",
          ),
        },
        {
          id: "profits",
          emblem: "profits",
          label: t("Business profits", "Laba usaha"),
          detail: money(profits),
          explanation: t(
            "Private industry value added remaining after actual wages and modeled costs becomes business profit. Positive annual profits feed corporate income tax and private investment. Public services earn no taxable profits in this model.",
            "Sisa nilai tambah industri swasta setelah upah aktual dan biaya model menjadi laba usaha. Laba tahunan positif menjadi dasar PPh badan dan investasi swasta. Layanan publik tidak menghasilkan laba kena pajak dalam model ini.",
          ),
        },
        {
          id: "consumption",
          emblem: "retail",
          label: t("Regional purchases", "Belanja wilayah"),
          detail: money(consumption),
          explanation: t(
            "Annual household consumption across the whole region, supported by income from all industries and transfers. It feeds VAT, excise, luxury tax and duties on imported household purchases.",
            "Konsumsi rumah tangga tahunan seluruh wilayah, didukung pendapatan semua industri dan bantuan. Menjadi dasar PPN, cukai, PPnBM, dan bea atas pembelian impor rumah tangga.",
          ),
        },
        {
          id: "imports",
          emblem: "logistics",
          label: t("Regional input imports", "Impor bahan wilayah"),
          detail: money(imports),
          explanation: t(
            "Annual imported inputs across all regional industries, calculated from output and each industry's import share. These inputs feed import duty alongside imported household purchases.",
            "Bahan baku impor tahunan seluruh industri wilayah, dihitung dari output dan porsi impor tiap industri. Bahan baku ini menjadi dasar bea masuk bersama pembelian impor rumah tangga.",
          ),
        },
      ],
    },
    {
      kind: "taxes",
      nodes: taxDefinitions.map((tax) => ({
        id: tax.id,
        label: {
          personalIncome: t("Income tax", "PPh pribadi"),
          corporateIncome: t("Profit tax", "PPh badan"),
          vat: t("VAT", "PPN"),
          importDuty: t("Import duty", "Bea masuk"),
          excise: t("Excise", "Cukai"),
          luxury: t("Luxury tax", "PPnBM"),
        }[tax.id],
        detail: report
          ? money(report.taxes[tax.id])
          : t("No receipts yet", "Belum dipungut"),
        explanation: `${tax.name[language]}. ${tax.description[language]} ${tax.tradeoff[language]} ${t("Shown receipts are the whole region's last-quarter total.", "Penerimaan yang ditampilkan adalah total wilayah pada triwulan lalu.")}`,
      })),
    },
  ];
  const connected = new Set(
    selected
      ? [
          selected,
          ...edges
            .filter((edge) => edge.from === selected || edge.to === selected)
            .flatMap((edge) => [edge.from, edge.to]),
        ]
      : [],
  );
  const edgeIdentity = JSON.stringify(edges);
  useLayoutEffect(() => {
    const root = diagram.current;
    if (!root) return;
    const measure = () => {
      const bounds = root.getBoundingClientRect();
      const nodes = Array.from(
        root.querySelectorAll<HTMLElement>("[data-graph-node]"),
      );
      const rects = new Map(
        nodes.map((node) => [
          node.dataset.graphNode!,
          node.getBoundingClientRect(),
        ]),
      );
      // Separate ports keep multiple connections from sharing one endpoint.
      const port = (edge: Edge, incoming: boolean) => {
        const key = incoming ? "to" : "from";
        const other = incoming ? "from" : "to";
        const siblings = edges
          .filter((item) => item[key] === edge[key] && rects.has(item[other]))
          .sort((a, b) => {
            const aRect = rects.get(a[other])!;
            const bRect = rects.get(b[other])!;
            return aRect.left + aRect.width / 2 - bRect.left - bRect.width / 2;
          });
        const sourceRect = rects.get(edge[key])!;
        if (
          !incoming &&
          siblings.every((item) => rects.get(item.to)!.top < sourceRect.bottom)
        )
          siblings.reverse();
        const fraction =
          siblings.length < 2
            ? 0.5
            : 0.14 + (0.72 * siblings.indexOf(edge)) / (siblings.length - 1);
        const rect = rects.get(edge[key])!;
        return rect.left + rect.width * fraction - bounds.left;
      };
      const next = edges.flatMap((edge) => {
        const from = rects.get(edge.from);
        const to = rects.get(edge.to);
        if (!from || !to) return [];
        const x1 = port(edge, false);
        const y1 = from.bottom - bounds.top + 5;
        const x2 = port(edge, true);
        const y2 = to.top - bounds.top - 4;
        const mid = (y1 + y2) / 2;
        // Siblings in one row (no room below the source) connect by a shallow
        // arc under the row, entering the target from below.
        const sameRow = to.top < from.bottom;
        const y3 = to.bottom - bounds.top + 5;
        const arcDepth = 36 + Math.min(32, Math.abs(x2 - x1) * 0.1);
        return [
          {
            ...edge,
            d: sameRow
              ? `M${x1},${y1} C${x1},${y1 + arcDepth} ${x2},${y3 + arcDepth} ${x2},${y3}`
              : `M${x1},${y1} C${x1},${mid} ${x2},${mid} ${x2},${y2}`,
          },
        ];
      });
      setPaths(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    root
      .querySelectorAll("[data-graph-node]")
      .forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [edgeIdentity, language, regionId]);
  const isEdgeHighlighted = (edge: Edge) =>
    edge.from === selected || edge.to === selected;
  const edgeStyle = (edge: Edge) =>
    ({ "--w": `${(1.25 + 3 * edge.weight).toFixed(2)}px` }) as CSSProperties;
  return (
    <section
      className="eco-relationships"
      aria-label={t("Regional relationship graph", "Grafik hubungan wilayah")}
    >
      <h3>{t("How this region connects", "Hubungan dalam wilayah ini")}</h3>
      <p className="eco-impact-note">
        {t(
          "Policy amounts show next-quarter planned funding. Select a card to highlight its connections; select it again to clear.",
          "Dana pada kartu kebijakan adalah rencana triwulan depan. Pilih kartu untuk menyorot hubungannya; pilih lagi untuk menghapus sorotan.",
        )}
      </p>
      {!!graphPolicies.length && (
        <p className="eco-impact-note">
          {t(
            "Plans include startup costs; national budget pressure may reduce delivery.",
            "Rencana mencakup biaya awal; tekanan anggaran nasional dapat mengurangi penyaluran.",
          )}
        </p>
      )}
      <div className="eco-graph-key">
        <span>{t("Solid: direct", "Utuh: langsung")}</span>
        <span>{t("Dashed: indirect", "Putus-putus: tidak langsung")}</span>
        <span>{t("Coral: negative effect", "Koral: dampak negatif")}</span>
        <span>
          {t("Wider: larger share", "Lebih lebar: porsi lebih besar")}
        </span>
        <StatHelp
          label={t("Read the connections", "Cara membaca hubungan")}
          description={t(
            "Read the connections from top to bottom. Solid lines show direct dependencies; dashed lines show indirect contributions to regional totals. Coral lines mark a negative policy impact. Line width shows the relative size of the contribution. Select a node to highlight only its immediate neighbors. Sensitivities are simulation weights, not guaranteed growth.",
            "Baca hubungan dari atas ke bawah. Garis utuh menunjukkan hubungan langsung; garis putus-putus menunjukkan kontribusi tidak langsung pada total wilayah. Garis koral menandai dampak negatif kebijakan. Lebar garis menunjukkan besar relatif kontribusi. Pilih simpul untuk menyorot tetangga langsungnya. Kepekaan adalah bobot simulasi, bukan jaminan pertumbuhan.",
          )}
        />
      </div>
      <div className="eco-graph-diagram" ref={diagram}>
        <svg
          className="eco-graph-edges"
          aria-hidden="true"
          data-selecting={!!selected}
        >
          {paths.map((edge, index) => (
            <path
              key={index}
              d={edge.d}
              data-from={edge.from}
              data-to={edge.to}
              data-highlighted={isEdgeHighlighted(edge)}
              data-negative={!!edge.negative}
              strokeDasharray={edge.indirect ? "5 4" : undefined}
              style={edgeStyle(edge)}
            />
          ))}
          {paths.map((edge, index) => (
            <path
              key={`flow-${index}`}
              className="eco-graph-flow"
              d={edge.d}
              data-highlighted={isEdgeHighlighted(edge)}
              data-negative={!!edge.negative}
              data-indirect={!!edge.indirect}
              style={edgeStyle(edge)}
            />
          ))}
        </svg>
        {rows.map((row) => (
          <div className="eco-graph-row" key={row.kind}>
            {row.kind === "policies" && !row.nodes.length && (
              <div>
                <p className="eco-impact-note">
                  {t(
                    "No policies in this region yet. Choose a policy to support its foundations and industries.",
                    "Belum ada kebijakan di wilayah ini. Pilih kebijakan untuk mendukung fondasi dan industrinya.",
                  )}
                </p>
                <button type="button" onClick={() => onPolicy("bos")}>
                  {t("View education policy", "Lihat kebijakan pendidikan")}
                </button>
              </div>
            )}
            <div
              className="eco-graph-nodes"
              data-kind={row.kind}
              data-compact={!!row.compact}
              style={
                row.kind === "policies" || row.kind === "industries"
                  ? ({
                      "--cols":
                        row.kind === "policies"
                          ? Math.min(3, row.nodes.length)
                          : row.nodes.length,
                    } as CSSProperties)
                  : undefined
              }
            >
              {row.nodes.map((node) => {
                const policy = graphPolicies.find(
                  (item) => node.id === `policy:${item.id}`,
                );
                if (policy) {
                  const planned = plan.policies.includes(policy.id);
                  const allocation = planned
                    ? policyAllocations(game, plan, policy.id).find(
                        (item) => item.region === regionId,
                      )
                    : undefined;
                  return (
                    <button
                      type="button"
                      className="eco-graph-policy-card"
                      key={node.id}
                      data-graph-node={node.id}
                      data-connected={connected.has(node.id)}
                      aria-pressed={selected === node.id}
                      aria-description={node.explanation}
                      onClick={() =>
                        setSelected(selected === node.id ? null : node.id)
                      }
                    >
                      <strong>{node.label}</strong>
                      <small>{money(allocation?.amount ?? 0)}</small>
                    </button>
                  );
                }
                return (
                  <button
                    type="button"
                    key={node.id}
                    data-graph-node={node.id}
                    data-connected={connected.has(node.id)}
                    aria-pressed={selected === node.id}
                    aria-description={node.explanation}
                    onClick={() =>
                      setSelected(selected === node.id ? null : node.id)
                    }
                  >
                    {node.emblem && (
                      <span className="eco-graph-emblem">
                        <EconomyEmblem kind={node.emblem} />
                      </span>
                    )}
                    <strong>{node.label}</strong>
                    {node.detail && <small>{node.detail}</small>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
