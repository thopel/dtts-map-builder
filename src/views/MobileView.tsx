import { useNavigate } from "react-router-dom";

export default function MobileView() {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-neutral-950 text-neutral-100">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-neutral-900 ring-1 ring-neutral-800" />
            <div className="leading-tight">
              <div className="font-hobo text-lg tracking-wide">DTTS Builder</div>
              <div className="text-xs text-neutral-400">Mode mobile</div>
            </div>
          </div>

          <button
            onClick={() => navigate("/editor", { replace: true })}
            className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 hover:bg-neutral-800 active:scale-[0.99]"
          >
            Desktop
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-md px-4 pb-24 pt-4">
        {/* Title card */}
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
          <div className="font-hobo text-2xl tracking-wide">Éditeur mobile</div>
          <p className="mt-2 text-sm text-neutral-300">Interface simplifiée pour manipuler la grille depuis un téléphone.</p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="rounded-xl bg-neutral-100 px-4 py-3 text-sm font-semibold text-neutral-950 active:scale-[0.99]">Ajouter tuile</button>
            <button className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 hover:bg-neutral-800 active:scale-[0.99]">
              Options
            </button>
          </div>
        </section>

        {/* Preview */}
        <section className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
          <div className="flex items-center justify-between">
            <div className="font-hobo text-lg tracking-wide">Aperçu</div>
            <span className="rounded-full border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs text-neutral-400">3 cm / case</span>
          </div>

          <div className="mt-3 aspect-[4/3] w-full rounded-2xl bg-neutral-950 ring-1 ring-neutral-800">
            {/* Placeholder preview area */}
            <div className="flex h-full items-center justify-center text-sm text-neutral-500">Aperçu de la grille (à brancher)</div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <button className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-3 text-sm hover:bg-neutral-800 active:scale-[0.99]">↺ Rot.</button>
            <button className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-3 text-sm hover:bg-neutral-800 active:scale-[0.99]">Effacer</button>
            <button className="rounded-xl bg-neutral-100 px-3 py-3 text-sm font-semibold text-neutral-950 active:scale-[0.99]">PDF</button>
          </div>
        </section>

        {/* Help / tips */}
        <section className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
          <div className="font-hobo text-lg tracking-wide">Astuce</div>
          <ul className="mt-2 space-y-2 text-sm text-neutral-300">
            <li className="flex gap-2">
              <span className="text-neutral-500">•</span>
              Appui long sur une tuile pour la supprimer.
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-500">•</span>
              Pince pour zoomer/dézoomer (si tu ajoutes le support).
            </li>
          </ul>
        </section>
      </main>

      {/* Bottom action bar */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-neutral-800 bg-neutral-950/80 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-2 px-4 py-3">
          <button className="rounded-2xl border border-neutral-800 bg-neutral-900 py-3 text-xs hover:bg-neutral-800 active:scale-[0.99]">Palette</button>
          <button className="rounded-2xl border border-neutral-800 bg-neutral-900 py-3 text-xs hover:bg-neutral-800 active:scale-[0.99]">Grille</button>
          <button className="rounded-2xl border border-neutral-800 bg-neutral-900 py-3 text-xs hover:bg-neutral-800 active:scale-[0.99]">Nom</button>
          <button className="rounded-2xl bg-neutral-100 py-3 text-xs font-semibold text-neutral-950 active:scale-[0.99]">Export</button>
        </div>
      </nav>
    </div>
  );
}
