import type { PlacedItem, PlacedOptions, TileRotation } from "../views/BoardBuilder";
import { IconButton, Toggle } from "../views/BoardBuilder";
import { version } from "../../package.json";

type Props = {
  selectedCell: string | null;
  selectedItem: PlacedItem | null;

  deleteSelected: () => void;
  rotateSelectedTile: () => void;

  setSelectedOption: <K extends keyof PlacedOptions>(key: K, value: PlacedOptions[K]) => void;

  setTopAt: (index: number, v: boolean) => void;
  setBottomAt: (index: number, v: boolean) => void;
  setLeftAt: (index: number, v: boolean) => void;
  setRightAt: (index: number, v: boolean) => void;

  clearBoard: () => void;

  getTileRotation: (it: PlacedItem) => TileRotation;
};

export default function Options({
  selectedCell,
  selectedItem,
  deleteSelected,
  rotateSelectedTile,
  setSelectedOption,
  setTopAt,
  setBottomAt,
  setLeftAt,
  setRightAt,
  getTileRotation,
}: Props) {
  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40 h-full">
      <div className="flex flex-col flex-1">
        <div className="border-b border-neutral-800 p-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-200">Options</h2>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-3">
          {!selectedCell || !selectedItem ? (
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-3 text-sm text-neutral-300">
              Sélectionne une case qui contient un élément.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-3">
                <div className="text-sm font-semibold">
                  {selectedItem.name}{" "}
                  <span className="mt-1 text-xs text-neutral-400">
                    {selectedItem.size.w}x{selectedItem.size.h}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <IconButton title="Supprimer" onClick={deleteSelected}>
                    Supprimer (suppr)
                  </IconButton>

                  <IconButton title="Pivoter (R)" onClick={rotateSelectedTile}>
                    Pivoter (R)
                  </IconButton>
                </div>

                <div className="mt-2 text-xs text-neutral-400">Rotation : {getTileRotation(selectedItem)}°</div>
              </div>

              {selectedItem.tileType === "road" && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-neutral-300">Route</div>
                  <Toggle
                    label="Alien"
                    checked={!!selectedItem.options.alien}
                    onChange={(v) => {
                      setSelectedOption("school_bus", false);
                      setSelectedOption("city_bus", false);
                      setSelectedOption("alien", v);
                    }}
                  />
                  <Toggle
                    label="Bus scolaire"
                    checked={!!selectedItem.options.school_bus}
                    onChange={(v) => {
                      setSelectedOption("alien", false);
                      setSelectedOption("city_bus", false);
                      setSelectedOption("school_bus", v);
                    }}
                  />
                  <Toggle
                    label="Bus municipal"
                    checked={!!selectedItem.options.city_bus}
                    onChange={(v) => {
                      setSelectedOption("alien", false);
                      setSelectedOption("school_bus", false);
                      setSelectedOption("city_bus", v);
                    }}
                  />
                </div>
              )}

              {(selectedItem.tileType === "school" || selectedItem.tileType === "safe_place") && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-neutral-300">{selectedItem.tileType === "school" ? "École" : "Zone sûre"} · Segments</div>

                  <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-3">
                    <div className="text-xs font-semibold text-neutral-300">Haut</div>
                    <div className="mt-2 space-y-2">
                      {Array.from({ length: selectedItem.size.w }).map((_, i) => (
                        <Toggle
                          key={`top-${i}`}
                          label={selectedItem.size.w > 1 ? `Entrée (col ${i + 1}/${selectedItem.size.w})` : "Entrée"}
                          checked={!!(selectedItem.options.topSegments as boolean[] | undefined)?.[i]}
                          onChange={(v) => setTopAt(i, v)}
                        />
                      ))}
                    </div>

                    <div className="mt-4 text-xs font-semibold text-neutral-300">Bas</div>
                    <div className="mt-2 space-y-2">
                      {Array.from({ length: selectedItem.size.w }).map((_, i) => (
                        <Toggle
                          key={`bottom-${i}`}
                          label={selectedItem.size.w > 1 ? `Entrée (col ${i + 1}/${selectedItem.size.w})` : "Entrée"}
                          checked={!!(selectedItem.options.bottomSegments as boolean[] | undefined)?.[i]}
                          onChange={(v) => setBottomAt(i, v)}
                        />
                      ))}
                    </div>

                    <div className="mt-4 text-xs font-semibold text-neutral-300">Gauche</div>
                    <div className="mt-2 space-y-2">
                      {Array.from({ length: selectedItem.size.h }).map((_, i) => (
                        <Toggle
                          key={`left-${i}`}
                          label={selectedItem.size.h > 1 ? `Entrée (ligne ${i + 1}/${selectedItem.size.h})` : "Entrée"}
                          checked={!!(selectedItem.options.leftSegments as boolean[] | undefined)?.[i]}
                          onChange={(v) => setLeftAt(i, v)}
                        />
                      ))}
                    </div>

                    <div className="mt-4 text-xs font-semibold text-neutral-300">Droite</div>
                    <div className="mt-2 space-y-2">
                      {Array.from({ length: selectedItem.size.h }).map((_, i) => (
                        <Toggle
                          key={`right-${i}`}
                          label={selectedItem.size.h > 1 ? `Entrée (ligne ${i + 1}/${selectedItem.size.h})` : "Entrée"}
                          checked={!!(selectedItem.options.rightSegments as boolean[] | undefined)?.[i]}
                          onChange={(v) => setRightAt(i, v)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <footer className="w-full border-t border-neutral-800/70 bg-neutral-950/60 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-4 text-sm text-neutral-200">
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between">
              <span className="font-medium text-neutral-100">Contenu non officiel</span>
              <span>v{version}</span>
            </div>

            <span className="text-neutral-300">
              Créé par{" "}
              <a
                href="https://thomaspelfrene.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-100 underline underline-offset-4 decoration-neutral-500 hover:decoration-neutral-200"
              >
                thomaspelfrene.com
              </a>
            </span>

            <span className="text-neutral-300">
              Questions ou suggestions :{" "}
              <a
                href="mailto:tpelfrene@gmail.com"
                className="text-neutral-100 underline underline-offset-4 decoration-neutral-500 hover:decoration-neutral-200"
              >
                tpelfrene@gmail.com
              </a>
            </span>
          </div>
        </div>
      </footer>
    </aside>
  );
}
