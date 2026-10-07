import { useEffect, useMemo, useRef, useState } from "react";
import { GameSelect } from "./GameSelect";
import { localize, useLanguage } from "./i18n";
import {
  geoMercator,
  geoPath,
  geoGraticule,
  type GeoPermissibleObjects,
} from "d3-geo";
import type { Province, Crisis, Project } from "./worldTypes";
import { number } from "./components";
import { gridOf, shipFood, type Shipment } from "./worldNetwork";
import {
  overlays,
  gridColors,
  layerConfig,
  layerColor,
  layerValue,
  regionLayerConfig,
  regionLayerValue,
  regionGridLabel,
  type Overlay,
} from "./mapLayers";
import { orientForD3, useAtlasGeography, type MapData } from "./mapData";
import {
  regionById,
  regionForProvince,
  summarizeRegions,
} from "./engine/gameRegions";
export type { Overlay } from "./mapLayers";

export function MapBackdrop() {
  const [data, setData] = useState<MapData | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}data/provinces.geojson`, {
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setData(orientForD3(d)))
      .catch(() => {});
    return () => controller.abort();
  }, []);
  const path = useMemo(
    () =>
      data
        ? geoPath(
            geoMercator().fitExtent(
              [
                [30, 70],
                [1370, 640],
              ],
              data,
            ),
          )
        : null,
    [data],
  );
  return (
    <svg
      className="map-backdrop"
      viewBox="0 0 1400 700"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {data?.features.map((f) => (
        <path key={f.properties.KODE_PROV} d={path!(f) ?? ""} />
      ))}
    </svg>
  );
}
export default function Atlas({
  provinces,
  selected,
  onSelect,
  focusRequest,
  crises,
  projects,
  onMarker,
  layer,
  onLayer,
  regional = false,
}: {
  provinces: Province[];
  selected: string;
  onSelect: (id: string) => void;
  focusRequest: number;
  crises: Crisis[];
  projects: Project[];
  onMarker: (id: string, kind: "crisis" | "project") => void;
  /** Optional controlled map layer, so national pillar buttons can switch it. */
  layer?: Overlay;
  onLayer?: (layer: Overlay) => void;
  regional?: boolean;
}) {
  const language = useLanguage();
  const t = (en: string, id: string) => (language === "id" ? id : en);
  const summaries = useMemo(() => summarizeRegions(provinces), [provinces]);
  const selectionId = (id: string) =>
    regional ? (regionForProvince(id)?.id ?? id) : id;
  const regionName = (id: string) => {
    const region = regionById(id);
    return region ? t(region.name, region.nameId) : id;
  };
  const geography = useAtlasGeography(
    provinces.map((p) => p.id),
    false,
  );
  const map = useMemo(
    () => (geography.map ? orientForD3(geography.map) : null),
    [geography.map],
  );
  const { error, retry } = geography;
  const [ownOverlay, setOwnOverlay] = useState<Overlay>("infrastructure");
  const overlay = layer ?? ownOverlay,
    setOverlay = onLayer ?? setOwnOverlay;
  const [hover, setHover] = useState<string | null>(null);
  const [camera, setCamera] = useState({ zoom: 1, x: 0, y: 0 });
  const [size, setSize] = useState({ width: 1100, height: 650 });
  const svg = useRef<SVGSVGElement>(null),
    container = useRef<HTMLElement>(null);
  const drag = useRef<{
    x: number;
    y: number;
    panX: number;
    panY: number;
    moved: boolean;
  } | null>(null);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const projection = useMemo(
    () =>
      map
        ? geoMercator().fitExtent(
            [
              [35, 185],
              [
                Math.max(150, size.width - 35),
                Math.max(260, size.height - 100),
              ],
            ],
            map as GeoPermissibleObjects,
          )
        : null,
    [map, size],
  );
  const path = useMemo(
    () => (projection ? geoPath(projection) : null),
    [projection],
  );
  const graticule = useMemo(
    () =>
      geoGraticule()
        .extent([
          [88, -20],
          [150, 32],
        ])
        .step([5, 5])(),
    [],
  );
  // Projection changes with geography or viewport size, never with the camera.
  // Keep coastline generation out of pointer, wheel, and hover renders.
  const provinceGeometry = useMemo(
    () =>
      new Map(
        map && path
          ? map.features.map((feature) => [
              feature.properties.KODE_PROV,
              {
                d: path(feature) ?? "",
                centroid: path.centroid(feature),
                bounds: path.bounds(feature),
              },
            ])
          : [],
      ),
    [map, path],
  );
  const graticulePath = useMemo(
    () => path?.(graticule) ?? "",
    [path, graticule],
  );
  const cx = size.width / 2,
    cy = size.height / 2;
  const clampCamera = (c: typeof camera) => ({
    ...c,
    x: Math.max(
      (-size.width * c.zoom) / 2,
      Math.min((size.width * c.zoom) / 2, c.x),
    ),
    y: Math.max(
      (-size.height * c.zoom) / 2,
      Math.min((size.height * c.zoom) / 2, c.y),
    ),
  });
  useEffect(() => {
    const node = svg.current;
    if (!node) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = node.getBoundingClientRect();
      const px = ((e.clientX - rect.left) * size.width) / rect.width - cx;
      const py = ((e.clientY - rect.top) * size.height) / rect.height - cy;
      setCamera((c) => {
        const zoom = Math.max(
          1,
          Math.min(4, c.zoom * Math.exp(-e.deltaY * 0.0015)),
        );
        const ratio = zoom / c.zoom;
        return clampCamera({
          zoom,
          x: px - (px - c.x) * ratio,
          y: py - (py - c.y) * ratio,
        });
      });
    };
    node.addEventListener("wheel", wheel, { passive: false });
    return () => node.removeEventListener("wheel", wheel);
  }, [size, map]);
  const lastFocus = useRef(0);
  useEffect(() => {
    if (!focusRequest || focusRequest === lastFocus.current || !path || !map)
      return;
    lastFocus.current = focusRequest;
    const members = regional
      ? (regionById(selected)?.provinceIds ?? [])
      : [selected];
    const memberBounds = members.flatMap((id) => {
      const geometry = provinceGeometry.get(id);
      return geometry ? [geometry.bounds] : [];
    });
    const geometry = memberBounds.length
      ? {
          bounds: [
            [
              Math.min(...memberBounds.map((b) => b[0][0])),
              Math.min(...memberBounds.map((b) => b[0][1])),
            ],
            [
              Math.max(...memberBounds.map((b) => b[1][0])),
              Math.max(...memberBounds.map((b) => b[1][1])),
            ],
          ],
        }
      : undefined;
    if (geometry) {
      const [[left, top], [right, bottom]] = geometry.bounds;
      const x = (left + right) / 2,
        y = (top + bottom) / 2;
      const zoom = Math.min(
        4,
        Math.max(
          1.5,
          Math.min(
            (size.width - 100) / Math.max(1, right - left),
            Math.max(140, size.height - 250) / Math.max(1, bottom - top),
          ),
        ),
      );
      setCamera(() =>
        clampCamera({
          zoom,
          x: (cx - x) * zoom,
          y: (cy - y) * zoom + 40,
        }),
      );
    }
  }, [focusRequest, path, map, selected, provinceGeometry, regional]);
  const config = regional
    ? regionLayerConfig(overlay, provinces)
    : layerConfig(overlay, provinces);
  const activeRegion =
    summaries.find((r) => r.id === (hover ? selectionId(hover) : selected)) ??
    summaries[0];
  const active =
    provinces.find((p) => p.id === (hover ?? selected)) ?? provinces[0];
  const valueOf = (p: Province) =>
    regional && overlay !== "grids"
      ? regionLayerValue(
          summaries.find((r) => r.id === selectionId(p.id))!,
          overlay,
        )
      : layerValue(p, overlay);
  const displayName = (p: Province) =>
    regional ? regionName(selectionId(p.id)) : p.name;
  const shipments = useMemo(() => {
    if (overlay !== "foodTrade") return [];
    const routes: Shipment[] = [];
    shipFood(
      provinces,
      new Map(provinces.map((p) => [p.id, p.foodProduction])),
      routes,
    );
    // The twelve largest routes keep the map readable.
    return routes.sort((a, b) => b.tons - a.tons).slice(0, 12);
  }, [overlay, provinces]);
  const valueLabel = (value: number) =>
    number(value, overlay === "population" ? 2 : 1);
  const color = (v: number) => layerColor(v, config);
  const move = (x: number, y: number) =>
    setCamera((c) => clampCamera({ ...c, x: c.x + x, y: c.y + y }));
  const transform = `translate(${cx + camera.x},${cy + camera.y}) scale(${camera.zoom}) translate(${-cx},${-cy})`;
  const markers = provinces.flatMap((p) => {
    const result: {
      province: string;
      kind: "crisis" | "project";
      label: string;
    }[] = [];
    const emergencies = crises.filter(
      (c) => !c.resolved && c.province === p.id,
    );
    const works = projects.filter((c) => !c.completed && c.province === p.id);
    if (emergencies.length)
      result.push({
        province: p.id,
        kind: "crisis",
        label: `${displayName(p)}: ${emergencies.length} ${t("active crisis", "krisis aktif")}`,
      });
    if (works.length)
      result.push({
        province: p.id,
        kind: "project",
        label: `${displayName(p)}: ${works.length} ${t("unfinished project", "proyek belum selesai")}`,
      });
    return result;
  });
  return localize(
    <section
      className="atlas"
      ref={container}
      aria-label={
        regional ? "Indonesia regional atlas" : "Indonesia province atlas"
      }
    >
      <div className="atlas-toolbar">
        <label>
          Map layer
          <GameSelect
            aria-label="Map layer"
            value={overlay}
            onChange={(e) => setOverlay(e.target.value as Overlay)}
          >
            {Object.entries(overlays).map(([k, v]) => (
              <option key={k} value={k}>
                {v.name}
              </option>
            ))}
          </GameSelect>
        </label>
      </div>
      {error ? (
        <div className="map-status" role="alert">
          <h2>The atlas could not be opened.</h2>
          <p>{error}</p>
          <button onClick={retry}>Retry map</button>
          <p>
            {regional
              ? "Select region remains available."
              : "Find a province remains available."}
          </p>
        </div>
      ) : !map ? (
        <div className="map-status" role="status">
          Unfolding the national atlas…
        </div>
      ) : (
        <svg
          ref={svg}
          className="country-map"
          viewBox={`0 0 ${size.width} ${size.height}`}
          aria-label={
            regional
              ? "Select any of Indonesia’s 9 regions"
              : "Select any of Indonesia’s 38 provinces"
          }
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            drag.current = {
              x: e.clientX,
              y: e.clientY,
              panX: camera.x,
              panY: camera.y,
              moved: false,
            };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (d && e.buttons) {
              const rect = e.currentTarget.getBoundingClientRect();
              const dx = ((e.clientX - d.x) * size.width) / rect.width,
                dy = ((e.clientY - d.y) * size.height) / rect.height;
              if (Math.abs(dx) + Math.abs(dy) > 5) d.moved = true;
              if (d.moved) {
                e.currentTarget.setPointerCapture(e.pointerId);
                setCamera((c) =>
                  clampCamera({ ...c, x: d.panX + dx, y: d.panY + dy }),
                );
              }
            }
          }}
          onPointerUp={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId))
              e.currentTarget.releasePointerCapture(e.pointerId);
            setTimeout(() => {
              drag.current = null;
            }, 0);
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onPointerLeave={() => {
            if (!drag.current?.moved) drag.current = null;
            setHover(null);
          }}
        >
          <defs>
            <marker
              id="route-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 Z" className="route-arrowhead" />
            </marker>
          </defs>
          <g transform={transform} data-testid="map-camera">
            <path className="graticule" d={graticulePath} />
            {map.features.map((f) => {
              const id = f.properties.KODE_PROV,
                p = provinces.find((p) => p.id === id)!;
              return (
                <path
                  key={id}
                  data-province-id={id}
                  data-region={regionForProvince(id)?.id}
                  d={provinceGeometry.get(id)?.d}
                  fill={config.fill ? config.fill(p) : color(valueOf(p))}
                  className={`province-shape ${selectionId(id) === selected ? "selected" : ""}`}
                  vectorEffect="non-scaling-stroke"
                  tabIndex={
                    !regional || regionForProvince(id)?.provinceIds[0] === id
                      ? 0
                      : -1
                  }
                  role="button"
                  aria-label={`${displayName(p)}, ${config.name} ${config.label ? config.label(p) : `${valueLabel(valueOf(p))}${config.unit}`}`}
                  aria-pressed={selected === selectionId(id)}
                  onMouseEnter={() => setHover(id)}
                  onFocus={() => setHover(id)}
                  onBlur={() => setHover(null)}
                  onClick={() => {
                    if (!drag.current?.moved) onSelect(selectionId(id));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(selectionId(id));
                    }
                  }}
                ></path>
              );
            })}
            {shipments.length > 0 && (
              <g className="food-routes" aria-hidden="true">
                {shipments.map((route) => {
                  const a = provinceGeometry.get(route.from)?.centroid;
                  const b = provinceGeometry.get(route.to)?.centroid;
                  if (!a || !b) return null;
                  // A gentle bend separates opposite routes and keeps lines off coastlines.
                  const mx = (a[0] + b[0]) / 2 - (b[1] - a[1]) * 0.15;
                  const my = (a[1] + b[1]) / 2 + (b[0] - a[0]) * 0.15;
                  return (
                    <path
                      key={`${route.from}-${route.to}`}
                      d={`M${a[0]},${a[1]} Q${mx},${my} ${b[0]},${b[1]}`}
                      strokeWidth={2 + Math.min(5, route.tons / 250000)}
                      vectorEffect="non-scaling-stroke"
                      markerEnd="url(#route-arrow)"
                    />
                  );
                })}
              </g>
            )}
            {[
              ["SUMATRA", 101, -1],
              ["JAVA", 110, -9.2],
              ["KALIMANTAN", 114, 1.8],
              ["SULAWESI", 121, -2],
              ["MALUKU", 129, -1.5],
              ["PAPUA", 138, -3],
            ].map(([label, lon, lat]) => {
              const pt = projection!([Number(lon), Number(lat)])!;
              return (
                <text
                  key={label}
                  x={pt[0]}
                  y={pt[1]}
                  className="island-label"
                  style={{
                    fontSize: 11 / camera.zoom,
                    strokeWidth: 2 / camera.zoom,
                  }}
                  textAnchor="middle"
                >
                  {label}
                </text>
              );
            })}
          </g>
          {markers.map((m) => {
            const [x, y] = provinceGeometry.get(m.province)!.centroid;
            return (
              <g
                key={`${m.kind}-${m.province}`}
                transform={`translate(${cx + camera.x + (x - cx) * camera.zoom + (m.kind === "project" ? 14 : -10)},${cy + camera.y + (y - cy) * camera.zoom - 14})`}
                className={`map-marker marker-${m.kind}`}
                role="button"
                tabIndex={0}
                aria-label={m.label}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onMarker(selectionId(m.province), m.kind)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onMarker(selectionId(m.province), m.kind);
                  }
                }}
              >
                {m.kind === "crisis" ? (
                  <path d="M0-14 14 12H-14Z" />
                ) : (
                  <rect x="-12" y="-12" width="24" height="24" rx="2" />
                )}
                <text y="5" textAnchor="middle">
                  {m.kind === "crisis" ? "!" : "⚒"}
                </text>
              </g>
            );
          })}
          <text
            className="ocean-label"
            x={size.width * 0.3}
            y={size.height - 100}
          >
            INDIAN OCEAN
          </text>
          <text className="ocean-label" x={size.width * 0.76} y={145}>
            PACIFIC OCEAN
          </text>
          <g
            className="compass"
            transform={`translate(${size.width - 60},${size.height - 125})`}
          >
            <circle r="26" />
            <path d="M0-25 7 0 0 25-7 0ZM-25 0H25M0-34V34" />
            <text y="-40" textAnchor="middle">
              N
            </text>
          </g>
        </svg>
      )}
      <div className={`map-caption${hover ? " is-hover" : ""}`}>
        <span className="eyebrow">
          {regional
            ? hover
              ? "Region in view"
              : "Selected region"
            : hover
              ? "Province in view"
              : "Selected province"}
        </span>
        <strong>{regional ? regionName(activeRegion.id) : active.name}</strong>
        <span>
          {config.name} ·{" "}
          {regional && overlay === "grids" ? (
            regionGridLabel(activeRegion)
          ) : config.label ? (
            config.label(active)
          ) : (
            <>
              {valueLabel(
                regional
                  ? regionLayerValue(activeRegion, overlay)
                  : valueOf(active),
              )}
              {config.unit}
            </>
          )}
        </span>
      </div>
      <div className="map-controls">
        <button
          aria-label="Zoom in"
          disabled={camera.zoom >= 4}
          onClick={() =>
            setCamera((c) => ({ ...c, zoom: Math.min(4, c.zoom + 0.4) }))
          }
        >
          +
        </button>
        <button
          aria-label="Zoom out"
          disabled={camera.zoom <= 1}
          onClick={() =>
            setCamera((c) =>
              clampCamera({ ...c, zoom: Math.max(1, c.zoom - 0.4) }),
            )
          }
        >
          −
        </button>
        <button
          aria-label="Reset map"
          onClick={() => setCamera({ zoom: 1, x: 0, y: 0 })}
        >
          ↺
        </button>
        <button aria-label="Pan left" onClick={() => move(80, 0)}>
          ←
        </button>
        <button aria-label="Pan right" onClick={() => move(-80, 0)}>
          →
        </button>
        <button aria-label="Pan up" onClick={() => move(0, 60)}>
          ↑
        </button>
        <button aria-label="Pan down" onClick={() => move(0, -60)}>
          ↓
        </button>
      </div>
      <div className="map-footer">
        {overlay === "landscape" ? (
          <div className="legend">Illustrative terrain</div>
        ) : overlay === "grids" ? (
          <div className="legend grid-legend">
            {Object.entries(gridColors).map(([grid, fill]) => (
              <span key={grid}>
                <i style={{ background: fill }} />
                {grid === "isolated" ? "Isolated island system" : grid}
              </span>
            ))}
          </div>
        ) : (
          <div className="legend">
            {overlay === "foodTrade" && (
              <span>
                {t("Estimated current routes", "Perkiraan rute saat ini")}
              </span>
            )}
            <span>
              {config.min}
              {config.unit}
            </span>
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => (
              <i
                key={t}
                style={{
                  background: color(config.min + (config.max - config.min) * t),
                }}
              />
            ))}
            <span>
              {config.max}
              {config.unit}
            </span>
          </div>
        )}
        <span>
          {regional ? t("9 regions", "9 wilayah") : "38 provinces"} ·{" "}
          <a
            href="https://github.com/ardian28/GeoJson-Indonesia-38-Provinsi"
            target="_blank"
            rel="noreferrer"
          >
            Map: Ardian Hasibuan
          </a>{" "}
          ·{" "}
          <a
            href="https://github.com/ardian28/GeoJson-Indonesia-38-Provinsi/blob/main/LICENSE"
            target="_blank"
            rel="noreferrer"
          >
            MIT
          </a>
          {" · "}
          <a
            href="https://www.naturalearthdata.com/about/terms-of-use/"
            target="_blank"
            rel="noreferrer"
          >
            Natural Earth
          </a>
        </span>
      </div>
    </section>,
  );
}
