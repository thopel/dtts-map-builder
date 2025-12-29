import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import Palette from "../components/Palette";
import Grid from "../components/Grid";
import Options from "../components/Options";

export type TileType = "road" | "school" | "safe_place";

export type PaletteItem = {
  type: string;
  tileType: TileType;
  name: string;
  colorClass: string;
  size?: { w: number; h: number };
};

export type TileRotation = 0 | 90 | 180 | 270;

export type RoadOptions = {
  alien: boolean;
  school_bus: boolean;
  city_bus: boolean;
};

export type TileCommonOptions = {
  rotation: TileRotation;
};

export type SchoolOptions = {
  topSegments: boolean[];
  bottomSegments: boolean[];
  leftSegments: boolean[];
  rightSegments: boolean[];
};

export type SafePlaceOptions = {
  topSegments: boolean[];
  bottomSegments: boolean[];
  leftSegments: boolean[];
  rightSegments: boolean[];
};

export type PlacedOptions = Partial<TileCommonOptions & RoadOptions & SchoolOptions & SafePlaceOptions>;

export type PlacedItem = {
  id: string;
  type: string;
  tileType: TileType;
  name: string;
  colorClass: string;

  // size = footprint courant (rotation prise en compte)
  size: { w: number; h: number };

  // baseSize = taille originale de l’asset
  baseSize: { w: number; h: number };

  options: PlacedOptions;
};

export type DragPayload = { kind: "new"; paletteType: string } | { kind: "move"; placedId: string; grabOffset: { dx: number; dy: number } };

export type Cell = null | { kind: "anchor"; item: PlacedItem } | { kind: "shadow"; anchorKey: string };

const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getCellRC(cellKey: string) {
  const [rStr, cStr] = cellKey.split(",");
  return { r: Number(rStr), c: Number(cStr) };
}

function isAnchor(cell: Cell): cell is { kind: "anchor"; item: PlacedItem } {
  return !!cell && cell.kind === "anchor";
}

function isShadow(cell: Cell): cell is { kind: "shadow"; anchorKey: string } {
  return !!cell && cell.kind === "shadow";
}

function getAnchorKeyFromCellKey(cellKey: string, grid: Record<string, Cell>): string | null {
  const cell = grid[cellKey];
  if (!cell) return null;
  if (isAnchor(cell)) return cellKey;
  if (isShadow(cell)) return cell.anchorKey;
  return null;
}

function getAnchorItem(cellKey: string, grid: Record<string, Cell>): PlacedItem | null {
  const anchorKey = getAnchorKeyFromCellKey(cellKey, grid);
  if (!anchorKey) return null;
  const cell = grid[anchorKey];
  if (cell && isAnchor(cell)) return cell.item;
  return null;
}

function getFootprint(it: Pick<PlacedItem, "size">) {
  const { w, h } = it.size;
  return { w, h };
}

function getCellsForFootprint(anchorKey: string, fp: { w: number; h: number }) {
  const { r, c } = getCellRC(anchorKey);
  const out: string[] = [];
  for (let dy = 0; dy < fp.h; dy++) {
    for (let dx = 0; dx < fp.w; dx++) out.push(`${r + dy},${c + dx}`);
  }
  return out;
}

function canPlaceAt(targetCell: string, itemLike: Pick<PlacedItem, "size">, grid: Record<string, Cell>, rows: number, cols: number) {
  const fp = getFootprint(itemLike);
  const { r, c } = getCellRC(targetCell);

  if (r < 0 || c < 0) return false;
  if (r + fp.h > rows) return false;
  if (c + fp.w > cols) return false;

  const keys = getCellsForFootprint(targetCell, fp);
  return keys.every((k) => grid[k] === null);
}

function writeItemAtAnchor(next: Record<string, Cell>, anchorKey: string, item: PlacedItem) {
  const fp = getFootprint(item);
  const keys = getCellsForFootprint(anchorKey, fp);

  next[anchorKey] = { kind: "anchor", item };
  for (const k of keys) {
    if (k === anchorKey) continue;
    next[k] = { kind: "shadow", anchorKey };
  }
}

function clearItemByAnchor(next: Record<string, Cell>, anchorKey: string) {
  const cell = next[anchorKey];
  if (!cell || !isAnchor(cell)) return;

  const fp = getFootprint(cell.item);
  const keys = getCellsForFootprint(anchorKey, fp);
  for (const k of keys) next[k] = null;
}

const ROAD_OPTION_TO_IMAGE: Record<keyof RoadOptions, string> = {
  alien: "alien",
  school_bus: "school_bus",
  city_bus: "city_bus",
};

function is1x1(it: Pick<PlacedItem, "baseSize">) {
  return it.baseSize.w === 1 && it.baseSize.h === 1;
}

function getTileRotation(it: PlacedItem): TileRotation {
  const v = it.options.rotation;
  return (v === 0 || v === 90 || v === 180 || v === 270 ? v : 0) as TileRotation;
}

function nextRotation(curr: TileRotation, allowFull: boolean): TileRotation {
  const order: TileRotation[] = allowFull ? [0, 90, 180, 270] : [0, 90];
  const idx = order.indexOf(curr);
  return order[(idx + 1 + order.length) % order.length];
}

function mapDisplayToSource(dx: number, dy: number, baseW: number, baseH: number, rot: TileRotation) {
  // retourne (sx, sy) dans l’image non-rotatée
  switch (rot) {
    case 0:
      return { sx: dx, sy: dy };
    case 90:
      // CW
      return { sx: dy, sy: baseH - 1 - dx };
    case 180:
      return { sx: baseW - 1 - dx, sy: baseH - 1 - dy };
    case 270:
      // CCW
      return { sx: baseW - 1 - dy, sy: dx };
  }
}

function getSliceStyle(it: PlacedItem, cellKey: string, anchorKey: string): React.CSSProperties {
  const { r: ar, c: ac } = getCellRC(anchorKey);
  const { r: cr, c: cc } = getCellRC(cellKey);

  const dx = cc - ac;
  const dy = cr - ar;

  const baseW = it.baseSize.w;
  const baseH = it.baseSize.h;

  const rot = getTileRotation(it);
  const { sx, sy } = mapDisplayToSource(dx, dy, baseW, baseH, rot);

  const xPct = baseW <= 1 ? 50 : (sx / (baseW - 1)) * 100;
  const yPct = baseH <= 1 ? 50 : (sy / (baseH - 1)) * 100;

  return {
    backgroundSize: `${baseW * 100}% ${baseH * 100}%`,
    backgroundPosition: `${xPct}% ${yPct}%`,
  };
}

function getDefaultOptions(tileType: TileType, size?: { w: number; h: number }): PlacedOptions {
  const w = size?.w ?? 1;
  const h = size?.h ?? 1;

  switch (tileType) {
    case "road":
      return { alien: false, school_bus: false, city_bus: false, rotation: 0 };

    case "school":
    case "safe_place":
      return {
        rotation: 0,
        topSegments: Array.from({ length: w }, () => false),
        bottomSegments: Array.from({ length: w }, () => false),
        leftSegments: Array.from({ length: h }, () => false),
        rightSegments: Array.from({ length: h }, () => false),
      };

    default:
      return { rotation: 0 };
  }
}

function normalizeOptions(it: PlacedItem): PlacedItem {
  const baseW = it.baseSize?.w ?? it.size.w;
  const baseH = it.baseSize?.h ?? it.size.h;

  const defaults = getDefaultOptions(it.tileType, { w: baseW, h: baseH });
  const merged: PlacedOptions = { ...defaults, ...(it.options ?? {}) };

  merged.rotation = (merged.rotation === 90 || merged.rotation === 180 || merged.rotation === 270 ? merged.rotation : 0) as TileRotation;

  const rot = merged.rotation as TileRotation;
  const swap = rot === 90 || rot === 270;
  const expectedSize = swap ? { w: baseH, h: baseW } : { w: baseW, h: baseH };
  const nextSize = { w: expectedSize.w, h: expectedSize.h };

  if (it.tileType === "school" || it.tileType === "safe_place") {
    const w = nextSize.w;
    const h = nextSize.h;

    const top = (merged.topSegments ?? []) as boolean[];
    const bottom = (merged.bottomSegments ?? []) as boolean[];
    const left = (merged.leftSegments ?? []) as boolean[];
    const right = (merged.rightSegments ?? []) as boolean[];

    merged.topSegments = Array.from({ length: w }, (_, i) => !!top[i]);
    merged.bottomSegments = Array.from({ length: w }, (_, i) => !!bottom[i]);
    merged.leftSegments = Array.from({ length: h }, (_, i) => !!left[i]);
    merged.rightSegments = Array.from({ length: h }, (_, i) => !!right[i]);
  }

  if (it.tileType === "road") {
    merged.alien = !!merged.alien;
    merged.school_bus = !!merged.school_bus;
    merged.city_bus = !!merged.city_bus;
  }

  return { ...it, baseSize: { w: baseW, h: baseH }, size: nextSize, options: merged };
}

/**
 * Rotation CW 90° des segments, en prenant les dimensions COURANTES (w,h).
 * Retourne aussi les segments avec les nouvelles longueurs (w' = h, h' = w).
 */
function rotateSegmentsCW90(opts: PlacedOptions, w: number, h: number): PlacedOptions {
  const top = (opts.topSegments ?? Array.from({ length: w }, () => false)) as boolean[];
  const bottom = (opts.bottomSegments ?? Array.from({ length: w }, () => false)) as boolean[];
  const left = (opts.leftSegments ?? Array.from({ length: h }, () => false)) as boolean[];
  const right = (opts.rightSegments ?? Array.from({ length: h }, () => false)) as boolean[];

  const newW = h;
  const newH = w;

  const newTop = Array.from({ length: newW }, (_, i) => !!left[h - 1 - i]);
  const newRight = Array.from({ length: newH }, (_, i) => !!top[i]);
  const newBottom = Array.from({ length: newW }, (_, i) => !!right[h - 1 - i]);
  const newLeft = Array.from({ length: newH }, (_, i) => !!bottom[i]);

  return { ...opts, topSegments: newTop, rightSegments: newRight, bottomSegments: newBottom, leftSegments: newLeft };
}

function rotateSegmentsBy(opts: PlacedOptions, w: number, h: number, stepsCW: number) {
  let out = { ...opts };
  let cw = stepsCW % 4;
  let curW = w;
  let curH = h;

  for (let i = 0; i < cw; i++) {
    out = rotateSegmentsCW90(out, curW, curH);
    const nextW = curH;
    const nextH = curW;
    curW = nextW;
    curH = nextH;
  }

  return { opts: out, w: curW, h: curH };
}

function rotationDeltaCW(prev: TileRotation, next: TileRotation) {
  const d = (next - prev + 360) % 360;
  return d / 90; // 0..3
}

function makeDragPreviewEl(it: PlacedItem, cellPx: number, getTileUrl: (type: string) => string, getRoadOverlay: (it: PlacedItem) => string | null) {
  const root = document.createElement("div");
  root.style.width = `${it.size.w * cellPx}px`;
  root.style.height = `${it.size.h * cellPx}px`;
  root.style.display = "grid";
  root.style.gridTemplateColumns = `repeat(${it.size.w}, ${cellPx}px)`;
  root.style.gridTemplateRows = `repeat(${it.size.h}, ${cellPx}px)`;
  root.style.position = "fixed";
  root.style.left = "-10000px";
  root.style.top = "-10000px";
  root.style.pointerEvents = "none";
  root.style.zIndex = "999999";
  (root.style as any).webkitPrintColorAdjust = "exact";
  (root.style as any).printColorAdjust = "exact";

  const tileBg = getTileUrl(it.type);
  const rotation = getTileRotation(it);
  const roadOverlay = it.tileType === "road" ? getRoadOverlay(it) : null;

  const baseW = it.baseSize.w;
  const baseH = it.baseSize.h;

  for (let dy = 0; dy < it.size.h; dy++) {
    for (let dx = 0; dx < it.size.w; dx++) {
      const cell = document.createElement("div");
      cell.style.width = `${cellPx}px`;
      cell.style.height = `${cellPx}px`;
      cell.style.position = "relative";
      cell.style.overflow = "hidden";

      const { sx, sy } = mapDisplayToSource(dx, dy, baseW, baseH, rotation);

      const xPct = baseW <= 1 ? 50 : (sx / (baseW - 1)) * 100;
      const yPct = baseH <= 1 ? 50 : (sy / (baseH - 1)) * 100;

      const bg = document.createElement("div");
      bg.style.position = "absolute";
      bg.style.inset = "0";
      bg.style.backgroundImage = `url(${tileBg})`;
      bg.style.backgroundRepeat = "no-repeat";
      bg.style.backgroundSize = `${baseW * 100}% ${baseH * 100}%`;
      bg.style.backgroundPosition = `${xPct}% ${yPct}%`;

      if (rotation) {
        bg.style.transform = `rotate(${rotation}deg)`;
        bg.style.transformOrigin = "50% 50%";
      }

      cell.appendChild(bg);

      if (roadOverlay) {
        const ov = document.createElement("div");
        ov.style.position = "absolute";
        ov.style.inset = "0";
        ov.style.backgroundImage = `url(${roadOverlay})`;
        ov.style.backgroundSize = "contain";
        ov.style.backgroundRepeat = "no-repeat";
        ov.style.backgroundPosition = "center";
        if (rotation) {
          ov.style.transform = `rotate(${rotation}deg)`;
          ov.style.transformOrigin = "50% 50%";
        }
        cell.appendChild(ov);
      }

      root.appendChild(cell);
    }
  }

  document.body.appendChild(root);
  return root;
}

function startDragMoveFromCell(
  e: React.DragEvent,
  it: PlacedItem,
  cellKey: string,
  anchorKey: string,
  cellSize: number,
  getTileUrl: (type: string) => string,
  getRoadOverlay: (it: PlacedItem) => string | null
) {
  const { r: ar, c: ac } = getCellRC(anchorKey);
  const { r: cr, c: cc } = getCellRC(cellKey);

  const grabOffset = { dx: cc - ac, dy: cr - ar };

  const payload: DragPayload = { kind: "move", placedId: it.id, grabOffset };
  e.dataTransfer.setData("application/x-boardbuilder", JSON.stringify(payload));
  e.dataTransfer.effectAllowed = "copyMove";

  const preview = makeDragPreviewEl(it, cellSize, getTileUrl, getRoadOverlay);

  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const localX = e.clientX - rect.left;
  const localY = e.clientY - rect.top;

  const ox = Math.floor(grabOffset.dx * cellSize + localX);
  const oy = Math.floor(grabOffset.dy * cellSize + localY);

  e.dataTransfer.setDragImage(preview, ox, oy);
  requestAnimationFrame(() => preview.remove());
}

function getRectsForCell(cellKey: string, grid: Record<string, Cell>, rows: number, cols: number) {
  const anchorKey = getAnchorKeyFromCellKey(cellKey, grid);
  if (!anchorKey) return { top: false, right: false, bottom: false, left: false };

  const it = getAnchorItem(anchorKey, grid);
  if (!it) return { top: false, right: false, bottom: false, left: false };

  const { r: ar, c: ac } = getCellRC(anchorKey);
  const { r: cr, c: cc } = getCellRC(cellKey);

  const dx = cc - ac;
  const dy = cr - ar;

  const w = it.size.w;
  const h = it.size.h;

  if (it.tileType === "school" || it.tileType === "safe_place") {
    const topSegments = (it.options.topSegments ?? []) as boolean[];
    const bottomSegments = (it.options.bottomSegments ?? []) as boolean[];
    const leftSegments = (it.options.leftSegments ?? []) as boolean[];
    const rightSegments = (it.options.rightSegments ?? []) as boolean[];

    const top = dy === 0 ? !!topSegments[dx] : false;
    const bottom = dy === h - 1 ? !!bottomSegments[dx] : false;
    const left = dx === 0 ? !!leftSegments[dy] : false;
    const right = dx === w - 1 ? !!rightSegments[dy] : false;

    return { top, right, bottom, left };
  }

  return { top: false, right: false, bottom: false, left: false };
}

function EdgeRect({ side, color }: { side: "top" | "right" | "bottom" | "left"; color: "blue" | "orange" }) {
  const base = "pointer-events-none absolute z-30 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]";
  const colorClass = color === "blue" ? "bg-blue-500" : "bg-orange-400";

  const length = "60%";
  const thickness = "18%";

  const style: React.CSSProperties = (() => {
    switch (side) {
      case "top":
        return { left: "50%", top: `calc(0px - (${thickness} / 2))`, width: length, height: thickness, transform: "translateX(-50%)" };
      case "bottom":
        return { left: "50%", bottom: `calc(0px - (${thickness} / 2))`, width: length, height: thickness, transform: "translateX(-50%)" };
      case "left":
        return { top: "50%", left: `calc(0px - (${thickness} / 2))`, width: thickness, height: length, transform: "translateY(-50%)" };
      case "right":
        return { top: "50%", right: `calc(0px - (${thickness} / 2))`, width: thickness, height: length, transform: "translateY(-50%)" };
    }
  })();

  return <div className={[base, colorClass].join(" ")} style={style} />;
}

export default function BoardBuilder() {
  const navigate = useNavigate();

  const rows = 6;
  const cols = 8;

  const [isGameMode, setIsGameMode] = useState(false);

  const getTileUrl = (type: string) => new URL(`../assets/tiles/${type}.png`, import.meta.url).href;
  const getOptionUrl = (fileBase: string) => new URL(`../assets/options/${fileBase}.png`, import.meta.url).href;

  function getRoadOptionOverlay(it: PlacedItem): string | null {
    if (it.tileType !== "road") return null;

    const order: Array<keyof RoadOptions> = ["alien", "school_bus", "city_bus"];
    const active = order.find((k) => !!it.options[k]);
    if (!active) return null;

    const fileBase = ROAD_OPTION_TO_IMAGE[active];
    return getOptionUrl(fileBase);
  }

  const palette: PaletteItem[] = useMemo(
    () => [
      { type: "crossroads-1x1", tileType: "road", name: "Croisement", colorClass: "bg-slate-600", size: { w: 1, h: 1 } },
      { type: "curve_road-1x1", tileType: "road", name: "Virage", colorClass: "bg-slate-600", size: { w: 1, h: 1 } },
      { type: "straight_road-1x1", tileType: "road", name: "Ligne droite", colorClass: "bg-slate-600", size: { w: 1, h: 1 } },
      { type: "end_road-1x1", tileType: "road", name: "Cul-de-sac", colorClass: "bg-slate-600", size: { w: 1, h: 1 } },
      { type: "forest-1x1", tileType: "road", name: "Forêt", colorClass: "bg-slate-600", size: { w: 1, h: 1 } },

      { type: "school-1x1", tileType: "school", name: "École", colorClass: "bg-gray-600", size: { w: 1, h: 1 } },
      { type: "school-2x1", tileType: "school", name: "École (2x1)", colorClass: "bg-gray-600", size: { w: 2, h: 1 } },

      { type: "library-2x1", tileType: "safe_place", name: "Bibliothèque", colorClass: "bg-blue-600", size: { w: 2, h: 1 } },
      { type: "house_2-1x1", tileType: "safe_place", name: "Pavillon", colorClass: "bg-blue-600", size: { w: 1, h: 1 } },
      { type: "house_3-1x1", tileType: "safe_place", name: "Pavillon", colorClass: "bg-blue-600", size: { w: 1, h: 1 } },
      { type: "house_5-1x1", tileType: "safe_place", name: "Pavillon", colorClass: "bg-blue-600", size: { w: 1, h: 1 } },
      { type: "manor_7-1x1", tileType: "safe_place", name: "Manoir", colorClass: "bg-blue-600", size: { w: 1, h: 1 } },
      { type: "manor_8-1x1", tileType: "safe_place", name: "Manoir", colorClass: "bg-blue-600", size: { w: 1, h: 1 } },

      { type: "parc-1x1", tileType: "safe_place", name: "Parc", colorClass: "bg-blue-600", size: { w: 1, h: 1 } },
      { type: "parc-2x1", tileType: "safe_place", name: "Parc (2x1)", colorClass: "bg-blue-600", size: { w: 2, h: 1 } },
      { type: "gymnasium-3x1", tileType: "safe_place", name: "Gymnase", colorClass: "bg-blue-600", size: { w: 3, h: 1 } },

      { type: "swimming_pool-1x2", tileType: "safe_place", name: "Piscine (1x2)", colorClass: "bg-blue-600", size: { w: 1, h: 2 } },
      { type: "swimming_pool-1x3", tileType: "safe_place", name: "Piscine (1x3)", colorClass: "bg-blue-600", size: { w: 1, h: 3 } },

      { type: "empty-1x1", tileType: "safe_place", name: "Espace vide", colorClass: "bg-blue-600", size: { w: 1, h: 1 } },
      { type: "empty-2x1", tileType: "safe_place", name: "Espace vide (2x1)", colorClass: "bg-blue-600", size: { w: 2, h: 1 } },
      { type: "empty-1x2", tileType: "safe_place", name: "Espace vide (1x2)", colorClass: "bg-blue-600", size: { w: 1, h: 2 } },
    ],
    []
  );

  const [grid, setGrid] = useState<Record<string, Cell>>(() => {
    const init: Record<string, Cell> = {};
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) init[`${r},${c}`] = null;
    return init;
  });

  const [selectedCell, setSelectedCell] = useState<string | null>(null);

  const gridAreaRef = useRef<HTMLDivElement | null>(null);
  const [cellSize, setCellSize] = useState<number>(64);

  useLayoutEffect(() => {
    const el = gridAreaRef.current;
    if (!el) return;

    const compute = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.max(0, rect.width);
      const h = Math.max(0, rect.height);
      if (w <= 0 || h <= 0) return;

      const gap = 0;
      const totalGapW = gap * (cols - 1);
      const totalGapH = gap * (rows - 1);

      const sizeByW = Math.floor((w - totalGapW) / cols);
      const sizeByH = Math.floor((h - totalGapH) / rows);

      const size = Math.min(sizeByW, sizeByH);
      setCellSize(clamp(size, 18, 160));
    };

    compute();
    const ro = new ResizeObserver(() => compute());
    ro.observe(el);
    return () => ro.disconnect();
  }, [cols, rows]);

  function findPaletteItem(type: string) {
    return palette.find((p) => p.type === type) ?? null;
  }

  function getDropAnchorCell(targetCell: string, payload: DragPayload): string {
    if (payload.kind !== "move") return targetCell;
    const { r, c } = getCellRC(targetCell);
    const nr = r - payload.grabOffset.dy;
    const nc = c - payload.grabOffset.dx;
    return `${nr},${nc}`;
  }

  function placeAtCell(payload: DragPayload, droppedCell: string) {
    setGrid((prev) => {
      const targetAnchor = getDropAnchorCell(droppedCell, payload);

      if (payload.kind === "new") {
        const p = findPaletteItem(payload.paletteType);
        if (!p) return prev;

        const baseSize = p.size ?? { w: 1, h: 1 };

        const newItem: PlacedItem = normalizeOptions({
          id: uid(),
          type: p.type,
          tileType: p.tileType,
          name: p.name,
          colorClass: p.colorClass,
          baseSize,
          size: baseSize,
          options: getDefaultOptions(p.tileType, baseSize),
        });

        if (!canPlaceAt(targetAnchor, newItem, prev, rows, cols)) return prev;

        const next = { ...prev };
        writeItemAtAnchor(next, targetAnchor, newItem);
        return next;
      }

      if (payload.kind === "move") {
        const fromAnchor = Object.keys(prev).find((k) => {
          const cell = prev[k];
          return cell && isAnchor(cell) && cell.item.id === payload.placedId;
        });
        if (!fromAnchor) return prev;

        const fromCell = prev[fromAnchor];
        if (!fromCell || !isAnchor(fromCell)) return prev;

        if (fromAnchor === targetAnchor) return prev;

        const moving = fromCell.item;

        const tmp = { ...prev };
        clearItemByAnchor(tmp, fromAnchor);

        if (!canPlaceAt(targetAnchor, moving, tmp, rows, cols)) return prev;

        const out = { ...prev };
        clearItemByAnchor(out, fromAnchor);
        writeItemAtAnchor(out, targetAnchor, moving);
        return out;
      }

      return prev;
    });
  }

  function removePlacedId(placedId: string) {
    setGrid((prev) => {
      const anchorKey =
        Object.keys(prev).find((k) => {
          const cell = prev[k];
          return cell && isAnchor(cell) && cell.item.id === placedId;
        }) ?? null;
      if (!anchorKey) return prev;

      const next = { ...prev };
      clearItemByAnchor(next, anchorKey);
      return next;
    });

    setSelectedCell(null);
  }

  function setSelectedOption<K extends keyof PlacedOptions>(key: K, value: PlacedOptions[K]) {
    if (!selectedCell) return;
    setGrid((prev) => {
      const anchorKey = getAnchorKeyFromCellKey(selectedCell, prev);
      if (!anchorKey) return prev;

      const cell = prev[anchorKey];
      if (!cell || !isAnchor(cell)) return prev;

      const next = { ...prev };
      const updated = normalizeOptions({
        ...cell.item,
        options: {
          ...cell.item.options,
          [key]: value,
        },
      });

      next[anchorKey] = { kind: "anchor", item: updated };
      return next;
    });
  }

  function deleteSelected() {
    if (!selectedCell) return;
    setGrid((prev) => {
      const anchorKey = getAnchorKeyFromCellKey(selectedCell, prev);
      if (!anchorKey) return prev;

      const next = { ...prev };
      clearItemByAnchor(next, anchorKey);
      return next;
    });
    setSelectedCell(null);
  }

  function rotateSelectedTile() {
    if (!selectedCell) return;

    setGrid((prev) => {
      const anchorKey = getAnchorKeyFromCellKey(selectedCell, prev);
      if (!anchorKey) return prev;

      const cell = prev[anchorKey];
      if (!cell || !isAnchor(cell)) return prev;

      const curr = normalizeOptions(cell.item);
      const currRot = getTileRotation(curr);

      const allowFull = is1x1(curr); // ✅ 1x1 => 0/90/180/270, sinon 0/90
      const nextRot = nextRotation(currRot, allowFull);

      const baseW = curr.baseSize.w;
      const baseH = curr.baseSize.h;

      // footprint : swap uniquement si 90/270
      const swap = nextRot === 90 || nextRot === 270;
      const nextSize = swap ? { w: baseH, h: baseW } : { w: baseW, h: baseH };

      const tmp = { ...prev };
      clearItemByAnchor(tmp, anchorKey);

      let candidate: PlacedItem = normalizeOptions({
        ...curr,
        size: nextSize,
        options: { ...curr.options, rotation: nextRot },
      });

      // segments (école / safe place) : on applique le delta (CW) par pas de 90
      if (candidate.tileType === "school" || candidate.tileType === "safe_place") {
        const steps = rotationDeltaCW(currRot, nextRot); // 0..3
        const startW = curr.size.w;
        const startH = curr.size.h;

        const rotated = rotateSegmentsBy(candidate.options, startW, startH, steps);
        candidate = normalizeOptions({ ...candidate, options: rotated.opts });
      }

      if (!canPlaceAt(anchorKey, candidate, tmp, rows, cols)) return prev;

      const next = { ...prev };
      clearItemByAnchor(next, anchorKey);
      writeItemAtAnchor(next, anchorKey, candidate);
      return next;
    });
  }

  useEffect(() => {
    document.body.style.overflow = "hidden";

    function onKeyDown(ev: KeyboardEvent) {
      if (!selectedCell) return;

      if (ev.key === "Delete" || ev.key === "Backspace") {
        deleteSelected();
        return;
      }

      if (ev.key.toLowerCase() === "r") {
        rotateSelectedTile();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedCell]);

  function clearBoard() {
    setGrid(() => {
      const init: Record<string, Cell> = {};
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) init[`${r},${c}`] = null;
      return init;
    });
    setSelectedCell(null);
  }

  function computeCellZIndex(cellKey: string): number {
    const anchorKey = getAnchorKeyFromCellKey(cellKey, grid);
    const it = anchorKey ? getAnchorItem(anchorKey, grid) : null;

    const selfRects = getRectsForCell(cellKey, grid, rows, cols);
    const hasAny = selfRects.top || selfRects.right || selfRects.bottom || selfRects.left;
    if (!hasAny) return 1;

    if (it?.tileType === "school") return 1000;

    const { r, c } = getCellRC(cellKey);

    const topKey = r > 0 ? `${r - 1},${c}` : null;
    const bottomKey = r < rows - 1 ? `${r + 1},${c}` : null;
    const leftKey = c > 0 ? `${r},${c - 1}` : null;
    const rightKey = c < cols - 1 ? `${r},${c + 1}` : null;

    const topRects = topKey ? getRectsForCell(topKey, grid, rows, cols) : null;
    const bottomRects = bottomKey ? getRectsForCell(bottomKey, grid, rows, cols) : null;
    const leftRects = leftKey ? getRectsForCell(leftKey, grid, rows, cols) : null;
    const rightRects = rightKey ? getRectsForCell(rightKey, grid, rows, cols) : null;

    let hasConflict = false;

    if (selfRects.top && bottomRects?.bottom) hasConflict = true;
    if (selfRects.bottom && topRects?.top) hasConflict = true;
    if (selfRects.left && rightRects?.right) hasConflict = true;
    if (selfRects.right && leftRects?.left) hasConflict = true;

    return hasConflict ? 20 : 5;
  }

  const selectedItem = selectedCell ? getAnchorItem(selectedCell, grid) : null;

  function setTopAt(index: number, v: boolean) {
    if (!selectedItem) return;
    if (selectedItem.tileType !== "school" && selectedItem.tileType !== "safe_place") return;
    const w = selectedItem.size.w;
    const arr = ((selectedItem.options.topSegments ?? Array.from({ length: w }, () => false)) as boolean[]).slice();
    arr[index] = v;
    setSelectedOption("topSegments", arr);
  }

  function setBottomAt(index: number, v: boolean) {
    if (!selectedItem) return;
    if (selectedItem.tileType !== "school" && selectedItem.tileType !== "safe_place") return;
    const w = selectedItem.size.w;
    const arr = ((selectedItem.options.bottomSegments ?? Array.from({ length: w }, () => false)) as boolean[]).slice();
    arr[index] = v;
    setSelectedOption("bottomSegments", arr);
  }

  function setLeftAt(index: number, v: boolean) {
    if (!selectedItem) return;
    if (selectedItem.tileType !== "school" && selectedItem.tileType !== "safe_place") return;
    const h = selectedItem.size.h;
    const arr = ((selectedItem.options.leftSegments ?? Array.from({ length: h }, () => false)) as boolean[]).slice();
    arr[index] = v;
    setSelectedOption("leftSegments", arr);
  }

  function setRightAt(index: number, v: boolean) {
    if (!selectedItem) return;
    if (selectedItem.tileType !== "school" && selectedItem.tileType !== "safe_place") return;
    const h = selectedItem.size.h;
    const arr = ((selectedItem.options.rightSegments ?? Array.from({ length: h }, () => false)) as boolean[]).slice();
    arr[index] = v;
    setSelectedOption("rightSegments", arr);
  }

  function parseDragPayload(raw: string): DragPayload | null {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as DragPayload;
    } catch {
      return null;
    }
  }

  function renderRectsForCell(cellKey: string, it: PlacedItem) {
    const rects = getRectsForCell(cellKey, grid, rows, cols);

    if (it.tileType === "school") {
      return (
        <>
          {rects.top ? <EdgeRect side="top" color="blue" /> : null}
          {rects.right ? <EdgeRect side="right" color="blue" /> : null}
          {rects.bottom ? <EdgeRect side="bottom" color="blue" /> : null}
          {rects.left ? <EdgeRect side="left" color="blue" /> : null}
        </>
      );
    }

    if (it.tileType === "safe_place") {
      return (
        <>
          {rects.top ? <EdgeRect side="top" color="orange" /> : null}
          {rects.right ? <EdgeRect side="right" color="orange" /> : null}
          {rects.bottom ? <EdgeRect side="bottom" color="orange" /> : null}
          {rects.left ? <EdgeRect side="left" color="orange" /> : null}
        </>
      );
    }

    return null;
  }

  function renderTileLayer({ it, tileBg, cellKey }: { it: PlacedItem; tileBg: string | null; cellKey: string }) {
    const anchorKey = getAnchorKeyFromCellKey(cellKey, grid);
    if (!anchorKey) return null;

    const rotation = getTileRotation(it);
    const roadOverlay = it.tileType === "road" ? getRoadOptionOverlay(it) : null;
    const slice = getSliceStyle(it, cellKey, anchorKey);

    return (
      <div className="relative h-full w-full">
        <div
          className="absolute inset-0"
          style={{
            transform: rotation ? `rotate(${rotation}deg)` : undefined,
            transformOrigin: "50% 50%",
          }}
        >
          <div
            className={["absolute inset-0", it.colorClass].join(" ")}
            style={{
              backgroundImage: tileBg ? `url(${tileBg})` : undefined,
              backgroundRepeat: "no-repeat",
              ...slice,
            }}
          >
            {renderRectsForCell(cellKey, it)}
          </div>
        </div>

        {roadOverlay ? (
          <div
            className="pointer-events-none absolute inset-0 z-40"
            style={{
              backgroundImage: `url(${roadOverlay})`,
              backgroundSize: "contain",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              transform: rotation ? `rotate(${rotation}deg)` : undefined,
              transformOrigin: "50% 50%",
            }}
          />
        ) : null}
      </div>
    );
  }

  function onPrint() {
    setSelectedCell(null);
    window.print();
  }

  return (
    <div className="h-screen w-screen bg-neutral-950 text-neutral-100">
      <style>{`
    @media print {
      @page { size: A4 landscape; margin: 10mm; }
      html, body { height: auto !important; overflow: visible !important; background: white !important; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body * { visibility: hidden !important; }
      .bb-print-target, .bb-print-target * { visibility: visible !important; }
      .bb-print-target { position: fixed !important; inset: 0 !important; padding: 0 !important; margin: 0 !important; }
      .bb-print-cell { width: 2.7cm !important; height: 2.7cm !important; transform: translate(155px, 117px) !important; }
      .bb-print-grid { grid-template-columns: repeat(var(--bb-cols), 2.7cm) !important; grid-template-rows: repeat(var(--bb-rows), 2.7cm) !important; gap: 0 !important; }
    }
    `}</style>

      <div className="flex h-full w-full flex-col p-4 bb-no-print">
        <header className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Constructeur de plateau de jeu pour Don't Talk To Strangers</h1>
            <p className="text-sm text-neutral-300">Déplace des tuiles vers la grille pour créer ton plateau personnalisé.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {!isGameMode && (
              <button className="rounded-xl bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700" onClick={onPrint}>
                Imprimer
              </button>
            )}

            <button className="rounded-xl bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700" onClick={() => setIsGameMode((v) => !v)}>
              {isGameMode ? "Quitter le mode jeu" : "Mode jeu"}
            </button>
          </div>
        </header>

        <div className="min-h-0 flex flex-1 gap-4">
          <aside
            className={[
              "min-h-0 overflow-hidden transition-all duration-300 ease-in-out",
              isGameMode ? "w-0 opacity-0 -translate-x-6 pointer-events-none" : "w-[350px] opacity-100 translate-x-0",
            ].join(" ")}
          >
            <div className="h-full">
              <Palette palette={palette} getTileUrl={getTileUrl} onRemovePlacedId={removePlacedId} parsePayload={parseDragPayload} />
            </div>
          </aside>

          <main className="min-h-0 flex-1 transition-all duration-300 ease-in-out bb-print-target">
            <Grid
              rows={rows}
              cols={cols}
              grid={grid}
              selectedCell={selectedCell}
              setSelectedCell={setSelectedCell}
              gridAreaRef={gridAreaRef}
              computeCellZIndex={computeCellZIndex}
              getTileUrl={getTileUrl}
              getAnchorKeyFromCellKey={(cellKey) => getAnchorKeyFromCellKey(cellKey, grid)}
              getAnchorItem={(cellKey) => getAnchorItem(cellKey, grid)}
              parsePayload={parseDragPayload}
              placeAtCell={placeAtCell}
              getDropAnchorCell={getDropAnchorCell}
              startDragMoveFromCell={(e, it, cellKey, anchorKey) =>
                startDragMoveFromCell(e, it, cellKey, anchorKey, cellSize, getTileUrl, getRoadOptionOverlay)
              }
              renderTileLayer={renderTileLayer}
            />
          </main>

          <aside
            className={[
              "min-h-0 overflow-hidden transition-all duration-300 ease-in-out",
              isGameMode ? "w-0 opacity-0 translate-x-6 pointer-events-none" : "w-[340px] opacity-100 translate-x-0",
            ].join(" ")}
          >
            <div className="h-full">
              <Options
                selectedCell={selectedCell}
                selectedItem={selectedItem}
                deleteSelected={deleteSelected}
                rotateSelectedTile={rotateSelectedTile}
                setSelectedOption={setSelectedOption}
                setTopAt={setTopAt}
                setBottomAt={setBottomAt}
                setLeftAt={setLeftAt}
                setRightAt={setRightAt}
                clearBoard={() => {}}
                getTileRotation={getTileRotation}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-neutral-950/40 px-3 py-2">
      <span className="text-sm text-neutral-200">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={[
          "relative h-6 w-11 rounded-full border transition",
          checked ? "border-neutral-200 bg-neutral-200" : "border-neutral-700 bg-neutral-900",
        ].join(" ")}
        aria-pressed={checked}
      >
        <span
          className={["absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition", checked ? "left-6 bg-neutral-900" : "left-1 bg-neutral-200"].join(
            " "
          )}
        />
      </button>
    </label>
  );
}

function IconButton({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title?: string }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="rounded-xl border border-neutral-800 bg-neutral-950/40 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-900/60"
    >
      {children}
    </button>
  );
}

export { Toggle, IconButton };
