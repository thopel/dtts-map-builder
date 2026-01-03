import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Grid from "../components/Grid";
import type { Cell, DragPayload, PlacedItem } from "../views/BoardBuilder";

type CommunityCreation = {
  id: string;
  title: string;
  publishedAt: string;
  // On suppose que tu stockes exactement ce qu’il faut pour re-rendre la grille.
  rows: number;
  cols: number;
  grid: Record<string, Cell>;
  boardName: string;
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("fr-FR", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * TODO: remplace par ton fetch réel :
 * - GET /community/:id
 * - doit renvoyer rows/cols/grid/boardName (et idéalement title/publishedAt)
 */
async function fetchCreationById(id: string): Promise<CommunityCreation | null> {
  // DEMO (à remplacer)
  return {
    id,
    title: "Création communautaire",
    publishedAt: new Date().toISOString(),
    rows: 6,
    cols: 8,
    boardName: "Ma carte",
    grid: {} as Record<string, Cell>,
  };
}

export default function CommunityItem() {
  const { id } = useParams<{ id: string }>();
  const decodedId = useMemo(() => (id ? decodeURIComponent(id) : ""), [id]);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [item, setItem] = useState<CommunityCreation | null>(null);

  // Ref requis par ton Grid (ResizeObserver)
  const gridAreaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        if (!decodedId) {
          setError("ID manquant.");
          setItem(null);
          return;
        }

        const data = await fetchCreationById(decodedId);
        if (!alive) return;

        if (!data) {
          setError("Création introuvable.");
          setItem(null);
          return;
        }

        setItem(data);
      } catch {
        if (!alive) return;
        setError("Impossible de charger la création.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [decodedId]);

  async function copyLink() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      alert("Lien copié.");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      alert("Lien copié.");
    }
  }

  function openInEditor() {
    // Ajuste si ton éditeur n’est pas "/"
    navigate(`/?communityId=${encodeURIComponent(decodedId)}`);
  }

  function handlePrint() {
    // CSS plus bas -> n’imprime QUE la zone rouge
    window.print();
  }

  // ---- Mode lecture seule pour Grid ----
  const selectedCell = null;

  const noopSetSelectedCell = () => {};
  const noopOnBoardNameChange = () => {};

  const computeCellZIndex = () => 0;

  // IMPORTANT: si tu as déjà une vraie méthode globale, remplace cette fonction
  // pour pointer vers tes assets.
  const getTileUrl = (type: string) => {
    // Exemple : /tiles/<type>.png
    return `/tiles/${type}.png`;
  };

  // On essaye d’être robuste sur la structure de Cell
  const getAnchorKeyFromCellKey = (cellKey: string) => {
    const cell = item?.grid?.[cellKey] as any;
    if (!cell) return null;
    // Si ton Cell contient un anchorKey
    if (typeof cell.anchorKey === "string") return cell.anchorKey;
    // Si le cell lui-même est un anchor (contient item)
    if (cell.item || cell.it || cell.placedItem) return cellKey;
    return null;
  };

  const getAnchorItem = (anchorKey: string) => {
    const cell = item?.grid?.[anchorKey] as any;
    if (!cell) return null;
    return (cell.item ?? cell.it ?? cell.placedItem ?? null) as PlacedItem | null;
  };

  const parsePayload = () => null as DragPayload | null;
  const placeAtCell = () => {};
  const getDropAnchorCell = (targetCell: string) => targetCell;

  const startDragMoveFromCell = (e: React.DragEvent) => {
    // On bloque le drag en communauté
    e.preventDefault();
    e.stopPropagation();
  };

  // Rendu simple : image en background (tu peux réinjecter ton overlay si besoin)
  const renderTileLayer = ({ it, tileBg }: { it: PlacedItem; tileBg: string | null; cellKey: string }) => {
    // si tileBg est null, on affiche rien
    if (!tileBg) return null;
    return (
      <div className="h-full w-full">
        <img src={tileBg} alt={it.type} draggable={false} className="h-full w-full object-cover" />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Bandeau top */}
      <div className="flex items-start justify-between gap-3 px-5 py-4">
        <div>
          <h1 className="text-xl font-semibold">Editeur de plateau de jeu pour Don&apos;t Talk To Strangers</h1>
          <div className="mt-1 text-sm text-white/70">
            {loading ? "Chargement…" : item ? `Publié le ${formatDateTime(item.publishedAt)} — ${item.title}` : "—"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyLink}
            disabled={loading || !item}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-40"
          >
            Copier le lien
          </button>

          <button
            onClick={openInEditor}
            disabled={loading || !item}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-40"
          >
            Ouvrir dans l&apos;éditeur
          </button>

          <button
            onClick={handlePrint}
            disabled={loading || !item}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-40"
          >
            Imprimer
          </button>
        </div>
      </div>

      <div className="px-5 pb-8">
        {error && <div className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>}

        {/* Zone rouge imprimable */}
        <div
          className="print-zone bb-print-target relative overflow-hidden rounded-2xl bg-[#FF1B1B] shadow-[0_0_0_2px_rgba(0,0,0,0.25)_inset]"
          style={{ minHeight: "calc(100vh - 140px)" }}
        >
          {/* Grid full zone */}
          <div className="absolute inset-0">
            <div className="h-full w-full">
              {loading || !item ? (
                <div className="flex h-full w-full items-center justify-center">
                  <div className="rounded-xl bg-black/10 px-4 py-3 text-sm text-black/80">Chargement…</div>
                </div>
              ) : (
                <div className="h-full w-full">
                  <Grid
                    rows={item.rows}
                    cols={item.cols}
                    grid={item.grid}
                    boardName={item.boardName}
                    onBoardNameChange={noopOnBoardNameChange}
                    selectedCell={selectedCell}
                    setSelectedCell={noopSetSelectedCell}
                    gridAreaRef={gridAreaRef}
                    computeCellZIndex={computeCellZIndex}
                    getTileUrl={getTileUrl}
                    getAnchorKeyFromCellKey={getAnchorKeyFromCellKey}
                    getAnchorItem={getAnchorItem}
                    parsePayload={parsePayload}
                    placeAtCell={placeAtCell}
                    getDropAnchorCell={getDropAnchorCell}
                    startDragMoveFromCell={startDragMoveFromCell as any}
                    renderTileLayer={renderTileLayer}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Print: n’imprimer QUE la zone rouge */}
      <style>{`
  @media print {
    @page { size: A4 landscape; margin: 10mm; }

    html, body {
      height: auto !important;
      overflow: visible !important;
      background: white !important;
    }

    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* On cache tout */
    body * { visibility: hidden !important; }

    /* Sauf la zone à imprimer */
    .bb-print-target, .bb-print-target * { visibility: visible !important; }

    /* La zone prend toute la feuille */
    .bb-print-target {
      position: fixed !important;
      inset: 0 !important;
      padding: 0 !important;
      margin: 0 !important;
      border-radius: 0 !important;
      overflow: hidden !important;
    }

    /* Taille des cases */
    .bb-print-cell {
      width: 3cm !important;
      height: 3cm !important;
    }

    /* IMPORTANT: on place/décale la GRILLE, pas les cellules */
    .bb-print-grid {
      grid-template-columns: repeat(var(--bb-cols), 3cm) !important;
      grid-template-rows: repeat(var(--bb-rows), 3cm) !important;
      gap: 0 !important;

      /* Ajuste ces valeurs pour centrer comme tu veux */
      transform: translate(145px, 88px) !important;
      transform-origin: top left !important;
    }

    /* Cartouche (input) tourné, façon ton exemple */
    .bb-print-input {
      transform: rotate(90deg) !important;
      position: absolute !important;
      left: 48px !important;
      top: -12px !important;
      transform-origin: left center !important;
    }

    /* Ligne bas de page */
    .bb-print-bottom-line {
      display: block !important;
      position: absolute !important;
      top: 270px !important;
      transform: rotate(90deg) !important;
      right: -235px !important;
      font-size: 9pt !important;
      color: #000 !important;
    }

    /* Optionnel: éviter que le fond noir du site “pollue” */
    .bb-print-target * {
      box-shadow: none !important;
    }
  }
`}</style>
    </div>
  );
}
