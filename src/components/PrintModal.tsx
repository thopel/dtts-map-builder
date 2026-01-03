// src/components/PrintModal.tsx
import { useEffect } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;

  boardName: string; // nom existant, lecture seule
  onPrint: () => void;

  onShare?: () => void; // optionnel
  shareDisabled?: boolean;

  title?: string;
};

export default function PrintModal({ isOpen, onClose, onPrint, onShare, shareDisabled, title = "Avant d'exporter" }: Props) {
  // fermeture avec ESC
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <button className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="Fermer" />

      {/* Modal */}
      <div className="relative w-[min(720px,92vw)] rounded-2xl bg-white shadow-xl">
        <div className="border-b border-black/10 p-5">
          <h2 className="text-lg font-semibold text-black">{title}</h2>
          <p className="mt-1 text-sm text-black/70">Avant d’exporter, vous pouvez choisir de partager votre carte avec la communauté.</p>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-xl border border-black/10 bg-black/5 p-4">
            <h3 className="text-sm font-semibold text-black">Partage communautaire</h3>
            <p className="mt-1 text-sm text-black/70">Le partage permet aux autres joueurs de découvrir et réutiliser votre carte.</p>

            <div className="mt-3 rounded-lg border border-black/10 bg-white p-3 text-sm">
              <p className="text-black">
                Donnée utilisée :<span className="font-medium"> uniquement le nom de la carte</span>.
              </p>
              <p className="mt-1 text-black/60">Aucune information personnelle n’est collectée.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-black/10 p-5 sm:flex-row sm:justify-between">
          <button onClick={onClose} className="rounded-xl border border-black/15 px-4 py-2 text-sm text-black hover:bg-black/5">
            Retour
          </button>

          <div className="flex flex-col gap-2 sm:flex-row">
            {onShare && (
              <button
                onClick={onShare}
                disabled={shareDisabled}
                className={[
                  "rounded-xl px-4 py-2 text-sm font-medium",
                  shareDisabled ? "cursor-not-allowed bg-black/10 text-black/40" : "bg-black text-white hover:bg-black/90",
                ].join(" ")}
              >
                Partager
              </button>
            )}

            <button
              onClick={() => {
                onClose();
                onPrint();
              }}
              className="rounded-xl border border-black/15 bg-white px-4 py-2 text-sm font-medium text-black hover:bg-black/5"
            >
              Télécharger le pdf
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
