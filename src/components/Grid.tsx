import React, { useLayoutEffect, useMemo, useState } from "react";
import type { Cell, DragPayload, PlacedItem } from "../views/BoardBuilder";

type Props = {
  rows: number;
  cols: number;
  grid: Record<string, Cell>;

  boardName: string;
  onBoardNameChange: (name: string) => void;

  selectedCell: string | null;
  setSelectedCell: (v: string | null) => void;

  gridAreaRef: React.RefObject<HTMLDivElement | null>;

  computeCellZIndex: (cellKey: string) => number;
  getTileUrl: (type: string) => string;

  getAnchorKeyFromCellKey: (cellKey: string) => string | null;
  getAnchorItem: (cellKey: string) => PlacedItem | null;

  parsePayload: (raw: string) => DragPayload | null;
  placeAtCell: (payload: DragPayload, droppedCell: string) => void;
  getDropAnchorCell: (targetCell: string, payload: DragPayload) => string;

  startDragMoveFromCell: (e: React.DragEvent, it: PlacedItem, cellKey: string, anchorKey: string) => void;

  renderTileLayer: (args: { it: PlacedItem; tileBg: string | null; cellKey: string }) => React.ReactNode;
};

export default function Grid({
  rows,
  cols,
  grid,
  selectedCell,
  boardName,
  onBoardNameChange,
  setSelectedCell,
  gridAreaRef,
  computeCellZIndex,
  getTileUrl,
  getAnchorKeyFromCellKey,
  getAnchorItem,
  parsePayload,
  placeAtCell,
  getDropAnchorCell,
  startDragMoveFromCell,
  renderTileLayer,
}: Props) {
  const [area, setArea] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = gridAreaRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      setArea({ w: cr.width, h: cr.height });
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [gridAreaRef]);

  const { cellPx, gridW, gridH } = useMemo(() => {
    const w = Math.max(0, area.w);
    const h = Math.max(0, area.h);

    if (rows <= 0 || cols <= 0 || w === 0 || h === 0) {
      return { cellPx: 0, gridW: 0, gridH: 0 };
    }

    const cell = Math.floor(Math.min(w / cols, h / rows));
    const gw = cell * cols;
    const gh = cell * rows;

    return { cellPx: cell, gridW: gw, gridH: gh };
  }, [area.w, area.h, rows, cols]);

  const onBoardNameChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
    onBoardNameChange(e.target.value);
  };

  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-[#ff2020] p-3">
      <div ref={gridAreaRef} className="flex-1 min-h-0 w-full overflow-hidden">
        <div className="flex h-full w-full items-start justify-center">
          <div
            className="shrink-0"
            style={{
              width: gridW ? `${gridW}px` : "100%",
              height: gridH ? `${gridH}px` : "100%",
            }}
          >
            <div
              className="grid bb-print-grid"
              style={{
                width: "100%",
                height: "100%",
                gridTemplateColumns: `repeat(${cols}, ${cellPx}px)`,
                gridTemplateRows: `repeat(${rows}, ${cellPx}px)`,
                ["--bb-cols" as any]: cols,
                ["--bb-rows" as any]: rows,
              }}
            >
              {Array.from({ length: rows * cols }).map((_, idx) => {
                const r = Math.floor(idx / cols);
                const c = idx % cols;
                const cellKey = `${r},${c}`;

                const cell = grid[cellKey];
                const anchorKey = getAnchorKeyFromCellKey(cellKey);
                const it = anchorKey ? getAnchorItem(anchorKey) : null;

                const isSelected = !!anchorKey && selectedCell === anchorKey;
                const zIndex = computeCellZIndex(cellKey);
                const tileBg = it ? getTileUrl(it.type) : null;

                return (
                  <div
                    key={cellKey}
                    className={[
                      "relative select-none transition",
                      "bg-neutral-950/40",
                      "bb-print-cell",
                      cell ? "border-none" : "border border-neutral-500",
                      isSelected ? "ring-2 ring-neutral-200" : "",
                    ].join(" ")}
                    style={{
                      zIndex,
                      width: `${cellPx}px`,
                      height: `${cellPx}px`,
                    }}
                    onClick={() => setSelectedCell(anchorKey ?? cellKey)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const payload = parsePayload(e.dataTransfer.getData("application/x-boardbuilder"));
                      if (!payload) return;

                      placeAtCell(payload, cellKey);

                      const newAnchor = payload.kind === "move" ? getDropAnchorCell(cellKey, payload) : cellKey;
                      setSelectedCell(newAnchor);
                    }}
                  >
                    {it ? (
                      <div
                        draggable
                        onDragStart={(e) => {
                          if (!anchorKey) return;
                          startDragMoveFromCell(e, it, cellKey, anchorKey);
                        }}
                        className="h-full w-full cursor-grab active:cursor-grabbing"
                      >
                        {renderTileLayer({ it, tileBg, cellKey })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <input
        id="boardName"
        value={boardName}
        onChange={onBoardNameChanged}
        type="text"
        className="bg-[#ffc223] border-3 border-black p-1 text-black w-80 mt-4 font-hobo text-xl bb-print-input"
      />
      <span className="bb-print-bottom-line text-black hidden">
        Carte créée sur dtts-builder.thomaspelfrene.com | Carte de jeu non officielle | thomaspelfrene.com
      </span>
    </main>
  );
}
