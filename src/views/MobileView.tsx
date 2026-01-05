import { version } from "../../package.json";

export default function MobileView() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-neutral-950 px-6 text-neutral-100">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 text-center">
        {/* Title */}
        <div className="font-hobo text-2xl tracking-wide">
          Éditeur de carte pour
          <br />
          Don't Talk To Strangers
        </div>

        <p className="mt-3 text-sm text-neutral-300">Merci d’être venu jeter un œil !</p>

        {/* Message */}
        <p className="mt-4 text-sm text-neutral-300">L’éditeur n’est pas disponible sur téléphone.</p>

        <p className="mt-2 text-sm text-neutral-400">Pour une expérience correcte, utilise un ordinateur ou une tablette.</p>

        {/* Separator */}
        <div className="my-5 h-px w-full bg-neutral-800" />

        {/* Footer info */}
        <div className="space-y-2 text-xs text-neutral-500">
          <p>Version {version}</p>

          <p>Contenu non officiel</p>

          <a
            href="https://thomaspelfrene.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-neutral-300 underline underline-offset-4 hover:text-neutral-100"
          >
            thomaspelfrene.com
          </a>
        </div>
      </div>
    </div>
  );
}
