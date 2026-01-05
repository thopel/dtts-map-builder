import type { DragPayload, PaletteItem } from "../views/BoardBuilder";

type Props = {
  palette: PaletteItem[];
  getTileUrl: (type: string) => string;
  onRemovePlacedId: (placedId: string) => void;
  parsePayload: (raw: string) => DragPayload | null;
  onClearTiles: () => void;
};

export default function Palette({ palette, getTileUrl, onRemovePlacedId, parsePayload, onClearTiles }: Props) {
  return (
    <aside
      className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40 h-full min-w-76"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => {
        e.preventDefault();
        const payload = parsePayload(e.dataTransfer.getData("application/x-boardbuilder"));
        if (!payload) return;
        if (payload.kind === "move") onRemovePlacedId(payload.placedId);
      }}
      title="Dépose ici un élément de la grille pour le supprimer"
    >
      <div className="border-b border-neutral-800 p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-200">Tuiles</h2>

          <button
            type="button"
            onClick={onClearTiles}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100"
          >
            Tout retirer
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        <div className="flex flex-col items-center justify-center space-y-2">
          {palette.map((p) => {
            const bg = getTileUrl(p.type);
            const isWide = (p.size?.w ?? 1) > (p.size?.h ?? 1);
            const isVertical = (p.size?.h ?? 1) > (p.size?.w ?? 1);
            const is3x = (p.size?.w ?? 1) >= 3;
            const is3y = (p.size?.h ?? 1) >= 3;

            let dimensionsClass = "h-22 w-22";
            if (isWide && !is3x) dimensionsClass = "h-22 w-44";
            else if (isVertical && !is3y) dimensionsClass = "h-44 w-22";
            else if (isWide && is3x) dimensionsClass = "h-22 w-66";
            else if (isVertical && is3y) dimensionsClass = "h-66 w-22";

            return (
              <div
                key={p.type}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/x-boardbuilder", JSON.stringify({ kind: "new", paletteType: p.type } satisfies DragPayload));
                  e.dataTransfer.effectAllowed = "copyMove";
                }}
                className="cursor-grab active:cursor-grabbing"
                title={p.name}
              >
                <div
                  className={["border border-neutral-800 bg-neutral-900", dimensionsClass].join(" ")}
                  style={{ backgroundImage: `url(${bg})`, backgroundSize: "cover", backgroundPosition: "center" }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
