import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Atlas from "./Atlas";
import { number } from "./components";
import { translate, useLanguage } from "./i18n";
import { useAtlasGeography } from "./mapData";
import type { MapData } from "./mapData";
import type { WorldGeometry } from "./mapGeometry";
import {
  gridColors,
  layerColor,
  regionLayerConfig,
  regionLayerValue,
  regionGridLabel,
  type Overlay,
} from "./mapLayers";
import type { Crisis, Project, Province } from "./worldTypes";
import type { QuarterVisualTransition } from "./quarterVisual";
import type { CameraAction } from "./WorldScene";
import type { PolicyStructureInput } from "./structureLayout";
import { summarizeRegions } from "./engine/gameRegions";

const WorldScene = lazy(() => import("./WorldScene"));
class SceneBoundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  return reduced;
}
function MapLoading({ label }: { label: string }) {
  return (
    <div className="world-status world-loading" role="status">
      <div className="world-loading-sea" aria-hidden="true">
        <span className="world-loading-island" />
        <span className="world-loading-island" />
        <span className="world-loading-island" />
        <span className="world-loading-boat" />
        <span className="world-loading-wave" />
      </div>
      <strong>{label}</strong>
    </div>
  );
}
export default function WorldMap({
  provinces,
  projects,
  crises,
  structures,
  selected,
  onSelect,
  onDismiss,
  layer,
  onLayer,
  mode,
  onMode,
  transition,
  startedAt,
  onFinish,
  onReady,
  inset,
}: {
  provinces: Province[];
  projects: Project[];
  crises: Crisis[];
  structures: PolicyStructureInput[];
  selected: string;
  onSelect: (id: string) => void;
  onDismiss?: () => void;
  layer: Overlay;
  onLayer: (layer: Overlay) => void;
  mode: "3d" | "2d";
  onMode: (mode: "3d" | "2d") => void;
  transition: QuarterVisualTransition | null;
  startedAt: number;
  onFinish: () => void;
  onReady: () => void;
  /** Map pixels covered on the left by a panel about the selected region. */
  inset: number;
}) {
  const language = useLanguage(),
    t = (en: string, id: string) => (language === "id" ? id : en);
  const reducedMotion = useReducedMotion();
  const { map, region, error, retry } = useAtlasGeography(
    provinces.map((p) => p.id),
  );
  useEffect(() => {
    if (error) onFinish();
  }, [error, transition, onFinish]);
  const [cameraAction, setCameraAction] = useState<CameraAction>({
    id: 0,
    kind: "reset",
  });
  const [failure, setFailure] = useState(false);
  const [sceneDrawn, setSceneDrawn] = useState(false);
  const [prepared, setPrepared] = useState<{
    map: MapData;
    world: WorldGeometry;
  } | null>(null);
  const preparationCallbacks = useRef({ onFinish, onMode });
  preparationCallbacks.current = { onFinish, onMode };
  useEffect(() => {
    if (!map || mode !== "3d") return;
    let live = true;
    setSceneDrawn(false);
    const unavailable = () => {
      if (!live) return;
      setFailure(true);
      preparationCallbacks.current.onFinish();
      preparationCallbacks.current.onMode("2d");
    };
    // Detect unsupported WebGL before spending time preparing a world it cannot draw.
    try {
      const probe = document.createElement("canvas").getContext("webgl2");
      if (!probe) {
        unavailable();
        return;
      }
      probe.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      unavailable();
      return;
    }
    import("./worldLoader")
      .then(({ prepareWorld }) => prepareWorld(map))
      .then((world) => {
        if (live) setPrepared({ map, world });
      })
      .catch(unavailable);
    return () => {
      live = false;
    };
  }, [map, mode]);
  const regions = useMemo(() => summarizeRegions(provinces), [provinces]);
  const config = regionLayerConfig(
    layer,
    provinces,
    transition?.beforeProvinces,
  );
  const active = regions.find((r) => r.id === selected) ?? regions[0];
  const [marker, setMarker] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const markerCrisis = marker
    ? crises.find((c) => c.id === marker.id && !c.resolved)
    : undefined;
  const cardRef = useRef<HTMLDivElement>(null);
  const fail = () => {
    setFailure(true);
    onFinish();
    onMode("2d");
  };
  const act = (kind: CameraAction["kind"]) => {
    onFinish();
    setCameraAction((c) => ({ id: c.id + 1, kind }));
  };
  return (
    <section
      className="world-map"
      aria-label={t("Indonesia regional atlas", "Atlas wilayah Indonesia")}
      data-mode={mode}
    >
      {failure && (
        <p className="world-notice" role="status">
          {t(
            "3D is unavailable. The 2D atlas and your game remain available.",
            "3D tidak tersedia. Atlas 2D dan permainan Anda tetap tersedia.",
          )}
          <button
            onClick={() => {
              setFailure(false);
              onMode("3d");
            }}
          >
            {t("Retry 3D", "Coba 3D lagi")}
          </button>
        </p>
      )}
      {mode === "2d" ? (
        <div className="world-svg">
          <Atlas
            regional
            provinces={provinces}
            selected={selected}
            onSelect={(id) => {
              onFinish();
              onSelect(id);
            }}
            focusRequest={cameraAction.id}
            projects={projects}
            crises={crises}
            onMarker={(id) => onSelect(id)}
            layer={layer}
            onLayer={onLayer}
          />
        </div>
      ) : error ? (
        <div className="world-status" role="alert">
          <h2>
            {t("The atlas could not be opened.", "Atlas tidak dapat dibuka.")}
          </h2>
          <p>
            {t(
              "Your plan and region controls are still available.",
              "Rencana dan kontrol wilayah tetap tersedia.",
            )}
          </p>
          <button onClick={retry}>{t("Retry map", "Coba lagi peta")}</button>
        </div>
      ) : !map ? (
        <MapLoading
          label={t("Preparing the national map…", "Menyiapkan peta nasional…")}
        />
      ) : prepared?.map !== map ? (
        <MapLoading
          label={t("Building the islands…", "Membangun pulau-pulau…")}
        />
      ) : (
        <div className="world-canvas" data-testid="world-canvas">
          <SceneBoundary key={mode} onFailure={fail}>
            <Suspense
              fallback={
                <MapLoading
                  label={t(
                    "Preparing 3D Indonesia…",
                    "Menyiapkan Indonesia 3D…",
                  )}
                />
              }
            >
              <WorldScene
                world={prepared.world}
                neighbours={region}
                provinces={provinces}
                projects={projects}
                crises={crises}
                structures={structures}
                selected={selected}
                layer={layer}
                transition={transition}
                startedAt={startedAt}
                cameraAction={cameraAction}
                inset={inset}
                reducedMotion={reducedMotion}
                onSelect={(id) => {
                  setMarker(null);
                  onFinish();
                  onSelect(id);
                }}
                onDismiss={() => {
                  setMarker(null);
                  onDismiss?.();
                }}
                card={marker ? { id: marker.id, el: cardRef } : undefined}
                onMarker={(id, x, y) => setMarker({ id, x, y })}
                onInteraction={onFinish}
                onFailure={fail}
                onReady={() => {
                  // Wait for the first painted frame before lifting the loader.
                  requestAnimationFrame(() =>
                    requestAnimationFrame(() => setSceneDrawn(true)),
                  );
                  onReady();
                }}
              />
            </Suspense>
          </SceneBoundary>
          {!sceneDrawn && (
            <MapLoading
              label={t("Building the islands…", "Membangun pulau-pulau…")}
            />
          )}
        </div>
      )}
      {mode === "3d" && (
        <>
          <div
            className="world-camera"
            role="group"
            aria-label={t("Map camera controls", "Kontrol kamera peta")}
          >
            <button
              onClick={() => act("in")}
              aria-label={t("Zoom in", "Perbesar")}
            >
              +
            </button>
            <button
              onClick={() => act("out")}
              aria-label={t("Zoom out", "Perkecil")}
            >
              −
            </button>
            <span className="world-camera-divider" aria-hidden="true" />
            <button
              className="world-camera-reset"
              onClick={() => act("reset")}
              aria-label={t("Reset view", "Atur ulang peta")}
            >
              {t("Reset", "Atur ulang")}
            </button>
            <span className="world-camera-divider" aria-hidden="true" />
            {(["left", "right", "up", "down"] as const).map((direction, i) => (
              <button
                key={direction}
                onClick={() => act(direction)}
                aria-label={t(
                  `Pan ${direction}`,
                  `Geser ${["kiri", "kanan", "atas", "bawah"][i]}`,
                )}
              >
                {["←", "→", "↑", "↓"][i]}
              </button>
            ))}
          </div>
          {layer !== "landscape" && (
            <div className="world-legend">
              {layer === "grids" ? (
                Object.entries(gridColors).map(([key, color]) => (
                  <span key={key}>
                    <i style={{ background: color }} />
                    {translate(
                      key === "isolated" ? "Isolated island system" : key,
                    )}
                  </span>
                ))
              ) : (
                <>
                  {layer === "foodTrade" && (
                    <span>
                      {t("Estimated current routes", "Perkiraan rute saat ini")}
                    </span>
                  )}
                  <span>
                    {number(config.min, 0)}
                    {translate(config.unit)}
                  </span>
                  <div className="world-scale">
                    {[0, 0.2, 0.4, 0.6, 0.8, 1].map((n) => (
                      <i
                        key={n}
                        style={{
                          background: layerColor(
                            config.min + n * (config.max - config.min),
                            config,
                          ),
                        }}
                      />
                    ))}
                  </div>
                  <span>
                    {number(config.max, 0)}
                    {translate(config.unit)}
                  </span>
                </>
              )}
            </div>
          )}
        </>
      )}
      {active && layer !== "landscape" && (
        <div className="world-selected">
          <div className="world-selected-stat">
            <span>
              {translate(config.name)}:{" "}
              {layer === "grids"
                ? regionGridLabel(active)
                    .split(" · ")
                    .map((label) => translate(label))
                    .join(" · ")
                : `${number(regionLayerValue(active, layer), layer === "population" ? 2 : 1)}${translate(config.unit)}`}
            </span>
          </div>
        </div>
      )}
      {markerCrisis && (
        <div
          className="world-event"
          role="dialog"
          aria-label={translate(markerCrisis.title)}
          ref={cardRef}
          onKeyDown={(e) => e.key === "Escape" && setMarker(null)}
        >
          <strong>{translate(markerCrisis.title)}</strong>
          <span className="world-event-stage">
            {t(
              markerCrisis.stage,
              {
                warning: "Peringatan",
                active: "Aktif",
                recovery: "Pemulihan",
              }[markerCrisis.stage],
            )}
          </span>
          <p>{translate(markerCrisis.description)}</p>
          <button autoFocus onClick={() => setMarker(null)}>
            {t("Close", "Tutup")}
          </button>
        </div>
      )}
    </section>
  );
}
