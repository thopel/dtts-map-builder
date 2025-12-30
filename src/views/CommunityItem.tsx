import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

type MiniCell = { tileType?: string; type?: string };
type BoardJsonLike = {
  rows?: number;
  cols?: number;
  grid?: Record<string, MiniCell>;
  items?: Array<MiniCell & { at?: string; cellKey?: string }>;
};

type CommunityCreation = {
  id: string;
  title: string;
  publishedAt: string;
  boardJson: BoardJsonLike;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "2-digit" });
}

function BigBoardPreview({ boardJson }: { boardJson: BoardJsonLike }) {
  const rows = Math.max(1, Math.min(80, boardJson?.rows ?? 10));
  const cols = Math.max(1, Math.min(80, boardJson?.cols ?? 10));

  const occupied = useMemo(() => {
    const m = new Map<number, string>();

    const parseKey = (key: string) => {
      const cleaned = key.replace(",", "-").replace("_", "-");
      const [r, c] = cleaned.split("-").map((x) => Number(x));
      if (!Number.isFinite(r) || !Number.isFinite(c)) return null;
      return { r, c };
    };

    if (boardJson?.grid) {
      for (const [k, v] of Object.entries(boardJson.grid)) {
        const rc = parseKey(k);
        if (!rc) continue;
        const tt = v?.tileType ?? v?.type ?? "unknown";
        if (rc.r < 0 || rc.c < 0 || rc.r >= rows || rc.c >= cols) continue;
        m.set(rc.r * cols + rc.c, tt);
      }
    }

    if (Array.isArray(boardJson?.items)) {
      for (const it of boardJson.items) {
        const key = it.cellKey ?? it.at;
        if (!key) continue;
        const rc = parseKey(key);
        if (!rc) continue;
        const tt = it?.tileType ?? it?.type ?? "unknown";
        if (rc.r < 0 || rc.c < 0 || rc.r >= rows || rc.c >= cols) continue;
        m.set(rc.r * cols + rc.c, tt);
      }
    }

    return m;
  }, [boardJson, rows, cols]);

  const tileClass = (tileType: string) => {
    const t = (tileType || "").toLowerCase();
    if (t.includes("road")) return "bg-white/12 border-white/10";
    if (t.includes("school")) return "bg-amber-500/18 border-amber-400/25";
    if (t.includes("safe")) return "bg-emerald-500/18 border-emerald-400/25";
    if (t.includes("forest")) return "bg-lime-500/14 border-lime-400/18";
    return "bg-sky-500/12 border-sky-400/18";
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-white/90">Aperçu</div>
        <div className="text-xs text-white/60">
          {rows}×{cols} — {occupied.size} tuile(s)
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/40 p-3">
        <div className="grid gap-[3px] rounded-lg bg-black/40 p-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: rows * cols }).map((_, i) => {
            const tt = occupied.get(i);
            return (
              <div
                key={i}
                className={["aspect-square rounded-[4px] border", tt ? tileClass(tt) : "bg-white/[0.03] border-white/[0.04]"].join(" ")}
                title={tt ? tt : ""}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// TODO: remplace par ton API
async function fetchCreationById(id: string): Promise<CommunityCreation | null> {
  // Démo minimale
  return {
    id,
    title: "Création communautaire",
    publishedAt: new Date().toISOString(),
    boardJson: {
      rows: 8,
      cols: 10,
      items: [
        { tileType: "road", at: "2-2" },
        { tileType: "school", at: "4-6" },
      ],
    },
  };
}

export default function CommunityItem() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const decodedId = useMemo(() => (id ? decodeURIComponent(id) : ""), [id]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [item, setItem] = useState<CommunityCreation | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        if (!decodedId) {
          setItem(null);
          setError("ID manquant.");
          return;
        }

        const data = await fetchCreationById(decodedId);
        if (!alive) return;

        if (!data) {
          setItem(null);
          setError("Création introuvable.");
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

  function handlePrint() {
    window.print();
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4">
          <div>
            <Link to="/community" className="text-sm text-white/60 hover:text-white/80 hover:underline">
              ← Retour aux créations
            </Link>
            <h1 className="mt-2 text-xl font-semibold tracking-tight">{loading ? "Chargement…" : item?.title ?? "Création"}</h1>
            {!loading && item && <p className="mt-1 text-sm text-white/60">Publié le {formatDate(item.publishedAt)}</p>}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/")} className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">
              Accéder à l’éditeur
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-6">
        {error && <div className="mb-6 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>}

        {!loading && item && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
            <BigBoardPreview boardJson={item.boardJson} />

            <aside className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold text-white/90">Infos</div>

              <div className="mt-3 text-sm">
                <div className="text-white/60">ID</div>
                <div className="mt-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs">{item.id}</div>

                <div className="mt-4 text-white/60">Actions</div>
                <div className="mt-2 grid grid-cols-1 gap-2">
                  <button onClick={copyLink} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">
                    Copier le lien
                  </button>
                  <button onClick={handlePrint} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">
                    Imprimer
                  </button>
                  <button onClick={() => navigate("/")} className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">
                    Editer cette carte
                  </button>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-black/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 text-xs text-white/60">
          <span>Contenu non officiel — Créations partagées par la communauté</span>
          <span>DTTS Builder — v1.0.0</span>
        </div>
      </footer>

      {/* Print: on cache header/footer/boutons */}
      <style>{`
        @media print {
          .sticky, footer, button, a[href="/community"] { display: none !important; }
          body { background: #fff !important; }
        }
      `}</style>
    </div>
  );
}
