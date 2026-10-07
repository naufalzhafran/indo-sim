import { useEffect, useState } from "react";
import { geoArea } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";

export type MapData = FeatureCollection<
  Geometry,
  { KODE_PROV: string; PROVINSI: string }
>;
export type RegionData = FeatureCollection<Geometry, { name: string }>;
export function orientForD3<T extends FeatureCollection<Geometry>>(data: T): T {
  const orient = (coordinates: number[][][]) =>
    geoArea({ type: "Polygon", coordinates }) > 2 * Math.PI
      ? coordinates.map((ring) => [...ring].reverse())
      : coordinates;
  return {
    ...data,
    features: data.features.map((f) => ({
      ...f,
      geometry:
        f.geometry.type === "Polygon"
          ? { ...f.geometry, coordinates: orient(f.geometry.coordinates) }
          : f.geometry.type === "MultiPolygon"
            ? { ...f.geometry, coordinates: f.geometry.coordinates.map(orient) }
            : f.geometry,
    })),
  } as T;
}
export function validateGeography(data: MapData, ids: string[]) {
  if (
    !Array.isArray(data.features) ||
    data.features.length !== 38 ||
    new Set(data.features.map((f) => f.properties.KODE_PROV)).size !== 38 ||
    data.features.some(
      (f) =>
        !ids.includes(f.properties.KODE_PROV) ||
        !["Polygon", "MultiPolygon"].includes(f.geometry.type),
    )
  )
    throw new Error("Map province validation failed");
  return data;
}
let provinceRequest: Promise<MapData> | undefined;
let regionRequest: Promise<RegionData> | undefined;
function fetchData<T>(name: string): Promise<T> {
  return fetch(`${import.meta.env.BASE_URL}data/${name}.geojson`).then((r) => {
    if (!r.ok) throw new Error("Map download failed");
    return r.json();
  });
}
export function useAtlasGeography(ids: string[], includeContext = true) {
  const [map, setMap] = useState<MapData | null>(null);
  const [region, setRegion] = useState<RegionData | null>(null);
  const [error, setError] = useState("");
  const [regionError, setRegionError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const idKey = ids.join(",");
  useEffect(() => {
    let live = true;
    setError("");
    setRegionError(false);
    provinceRequest ??= fetchData<MapData>("provinces");
    if (includeContext) regionRequest ??= fetchData<RegionData>("region");
    provinceRequest
      .then((data) => {
        const validated = validateGeography(data, idKey.split(","));
        if (live) setMap(validated);
      })
      .catch((e) => {
        provinceRequest = undefined;
        if (live) setError(e.message);
      });
    if (includeContext)
      regionRequest!
        .then((data) => {
          if (live) setRegion(data);
        })
        .catch(() => {
          regionRequest = undefined;
          if (live) setRegionError(true);
        });
    return () => {
      live = false;
    };
  }, [attempt, idKey, includeContext]);
  return {
    map,
    region,
    error,
    regionError,
    retry: () => setAttempt((n) => n + 1),
  };
}
