import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

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
  publishedAt: string; // ISO
  boardJson: BoardJsonLike;
};

const PAGE_SIZE = 10;

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { year: "numeric", month: "short", day: "2-digit" });
}

/**
 * Mini preview “grille” :
 * - base sombre
 * - on colorie légèrement les cellules occupées selon le type
 */
function MiniBoardPreview({ boardJson }: { boardJson: BoardJsonLike }) {
  const rows = Math.max(1, Math.min(50, boardJson?.rows ?? 10));
  const cols = Math.max(1, Math.min(50, boardJson?.cols ?? 10));

  const occupied = useMemo(() => {
    const m = new Map<string, string>();

    // Cas 1: grid: Record<cellKey, cell>
    if (boardJson?.grid) {
      for (const [k, v] of Object.entries(boardJson.grid)) {
        const tt = v?.tileType ?? v?.type ?? "unknown";
        m.set(k, tt);
      }
    }

    // Cas 2: items: [{ at: "r-c" | cellKey, tileType }]
    if (Array.isArray(boardJson?.items)) {
      for (const it of boardJson.items) {
        const key = it.cellKey ?? it.at;
        if (!key) continue;
        const tt = it?.tileType ?? it?.type ?? "unknown";
        m.set(key, tt);
      }
    }

    return m;
  }, [boardJson]);

  const tileClass = (tileType: string) => {
    const t = (tileType || "").toLowerCase();
    if (t.includes("road")) return "bg-white/10 border-white/10";
    if (t.includes("school")) return "bg-amber-500/15 border-amber-400/20";
    if (t.includes("safe")) return "bg-emerald-500/15 border-emerald-400/20";
    if (t.includes("forest")) return "bg-lime-500/12 border-lime-400/15";
    return "bg-sky-500/10 border-sky-400/15";
  };

  const parseKey = (key: string) => {
    // support "r-c" ou "r,c" ou "r_c"
    const cleaned = key.replace(",", "-").replace("_", "-");
    const [r, c] = cleaned.split("-").map((x) => Number(x));
    if (!Number.isFinite(r) || !Number.isFinite(c)) return null;
    return { r, c };
  };

  const occupiedIndex = useMemo(() => {
    // On transforme en index 0..(rows*cols-1) si possible
    const set = new Map<number, string>();
    for (const [k, tt] of occupied.entries()) {
      const rc = parseKey(k);
      if (!rc) continue;
      const { r, c } = rc;
      if (r < 0 || c < 0 || r >= rows || c >= cols) continue;
      set.set(r * cols + c, tt);
    }
    return set;
  }, [occupied, rows, cols]);

  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-3">
      <div className="grid gap-[2px] rounded-lg bg-black/40 p-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: rows * cols }).map((_, i) => {
          const tt = occupiedIndex.get(i);
          return (
            <div
              key={i}
              className={["aspect-square rounded-[3px] border", tt ? tileClass(tt) : "bg-white/[0.03] border-white/[0.04]"].join(" ")}
              title={tt ? tt : ""}
            />
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-white/60">
        <span>
          {rows}×{cols}
        </span>
        <span>{occupiedIndex.size} tuile(s)</span>
      </div>
    </div>
  );
}

// TODO: remplace par ton appel API
async function fetchCommunityCreations(): Promise<CommunityCreation[]> {
  return [
    {
      id: "c_1007",
      title: "Plateau école - quartier Nord",
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
      boardJson: {
        rows: 8,
        cols: 10,
        items: [
          { tileType: "road", at: "2-2" },
          { tileType: "school", at: "4-6" },
        ],
      },
    },
    {
      id: "c_1006",
      title: "Ville simple (démo)",
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
      boardJson: {
        rows: 8,
        cols: 10,
        items: [
          { tileType: "safe_place", at: "1-1" },
          { tileType: "road", at: "1-2" },
        ],
      },
    },
    {
      id: "c_1005",
      title: "Safe place + routes",
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
      boardJson: {
        rows: 8,
        cols: 10,
        items: [
          { tileType: "road", at: "6-3" },
          { tileType: "road", at: "6-4" },
        ],
      },
    },
    {
      id: "c_1004",
      title: "Centre-ville compact",
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 40).toISOString(),
      boardJson: { rows: 8, cols: 10, items: [{ tileType: "forest", at: "0-0" }] },
    },
  ].sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
}

export default function Community() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [all, setAll] = useState<CommunityCreation[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchCommunityCreations();
        if (!alive) return;
        setAll(data);
      } catch {
        if (!alive) return;
        setError("Impossible de charger les créations.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((x) => x.title.toLowerCase().includes(q));
  }, [all, query]);

  const featured = useMemo(() => filtered.slice(0, 3), [filtered]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), [filtered.length]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => setPage(1), [query]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Créations de la communauté</h1>
            <p className="mt-1 text-sm text-white/60">Cherche une carte, ouvre-la, imprime-la, ou récupère le lien.</p>
          </div>

          <button
            onClick={() => navigate("/")}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
            title="Retour à l’éditeur"
          >
            Accéder à l’éditeur
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-6">
        {/* Search bar */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-md">
            <label className="mb-1 block text-sm font-medium text-white/80">Rechercher par nom</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: école, centre-ville, safe place…"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/20"
            />
          </div>

          <div className="text-sm text-white/60">{loading ? "Chargement…" : `${filtered.length} carte(s)`}</div>
        </div>

        {error && <div className="mb-6 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>}

        {/* Featured */}
        <section className="mb-8">
          <h2 className="mb-3 text-base font-semibold text-white/90">Les 3 dernières</h2>

          {loading ? (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-white/60">Chargement…</div>
          ) : featured.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-white/60">Aucune carte à afficher.</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {featured.map((it) => (
                <Link
                  key={it.id}
                  to={`/community/${encodeURIComponent(it.id)}`}
                  className="group rounded-2xl border border-white/10 bg-white/5 p-4 hover:border-white/20 hover:bg-white/7"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold group-hover:underline">{it.title}</div>
                      <div className="mt-1 text-xs text-white/60">Publié le {formatDate(it.publishedAt)}</div>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/70">Nouveau</span>
                  </div>

                  <div className="mt-3">
                    <MiniBoardPreview boardJson={it.boardJson} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Gallery + pagination */}
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="text-base font-semibold text-white/90">Galerie</h2>

            <div className="flex items-center gap-2 text-sm">
              <button
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 disabled:opacity-40"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
              >
                Précédent
              </button>

              <div className="text-white/60">
                Page {page} / {totalPages}
              </div>

              <button
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 disabled:opacity-40"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
              >
                Suivant
              </button>
            </div>
          </div>

          {loading ? (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-white/60">Chargement…</div>
          ) : pageItems.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-white/60">Aucun résultat.</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {pageItems.map((it) => (
                <Link
                  key={it.id}
                  to={`/community/${encodeURIComponent(it.id)}`}
                  className="group rounded-2xl border border-white/10 bg-white/5 p-4 hover:border-white/20 hover:bg-white/7"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold group-hover:underline">{it.title}</div>
                      <div className="mt-1 text-xs text-white/60">Publié le {formatDate(it.publishedAt)}</div>
                    </div>
                    <div className="text-[11px] text-white/45">#{it.id}</div>
                  </div>

                  <div className="mt-3">
                    <MiniBoardPreview boardJson={it.boardJson} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 text-xs text-white/60">
          <span>Contenu non officiel — Créations partagées par la communauté</span>
          <span>DTTS Builder — v1.0.0</span>
        </div>
      </footer>
    </div>
  );
}
