import { useEffect, useRef } from 'react'
import { AIS_ATTRIBUTION_TEXT } from '../config/texts'
import { CloseIcon } from './Icons'
import { Legend } from './Legend'

export function HowToDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="howto-title"
      className="m-auto max-h-[90dvh] w-[min(40rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-sea-600 bg-sea-900 p-0 text-foam shadow-2xl backdrop:bg-abyss/80 backdrop:backdrop-blur-sm"
    >
      <div className="sticky top-0 flex items-center justify-between border-b border-sea-700 bg-sea-900 px-5 py-4">
        <h2 id="howto-title" className="font-display text-xl font-bold tracking-wide uppercase">
          Slik spiller du
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="btn-ghost min-h-11 px-3"
          aria-label="Lukk"
        >
          <CloseIcon className="size-5" />
        </button>
      </div>
      <div className="space-y-6 px-5 py-5 leading-relaxed">
        <section>
          <h3 className="label-caps mb-2">Oppdraget</h3>
          <p>
            Du har fyrvakta. Hver runde får du et oppdrag – for eksempel{' '}
            <em>«Finn skipet som går raskest»</em>. Trykk på skipet på kartet (eller velg det i
            fartøylisten) og bekreft. Du har <strong>25 sekunder</strong>.
          </p>
        </section>
        <section>
          <h3 className="label-caps mb-2">Les radaren</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>Skipssymbolet peker i retningen skipet beveger seg. Nord er alltid opp.</li>
            <li>
              Streken foran skipet er <strong>fartsvektoren</strong>: hvor skipet er om 6 minutter.
              10 knop = 1 nautisk mil.
            </li>
            <li>Symbolstørrelsen følger skipets lengde. Runde symboler ligger i ro.</li>
            <li>Den gule bøyen har ringer for hver nautiske mil.</li>
            <li>Bokstaven over hvert skip (A, B, C …) brukes i fartøylisten.</li>
          </ul>
        </section>
        <section>
          <h3 className="label-caps mb-2">Skipstyper</h3>
          <Legend />
        </section>
        <section>
          <h3 className="label-caps mb-2">Poeng</h3>
          <ul className="space-y-1">
            <li>Riktig svar: 1 000 poeng + 25 per sekund igjen + opptil 500 for presisjon.</li>
            <li>Nesten riktig (f.eks. nest raskeste skip) gir noen trøstepoeng.</li>
            <li>
              Rekke på rad gir multiplikator: 2 → ×1,2 · 3 → ×1,5 · 4 → ×2 · 5+ →{' '}
              <strong>×2,5</strong>
            </li>
            <li>
              Feil svar eller tiden ute koster en redningsbøye. Tre tapte, og spillet er over.
            </li>
          </ul>
        </section>
        <section>
          <h3 className="label-caps mb-2">Dagens utfordring</h3>
          <p>
            Fem runder i samme farvann og med samme oppdrag for alle, hver dag. Skipene er de som
            faktisk er der når du spiller.
          </p>
        </section>
        <section className="rounded-xl border border-sea-700 bg-sea-950/60 p-4 text-sm text-mist">
          <h3 className="label-caps mb-2">Om dataene</h3>
          <p>{AIS_ATTRIBUTION_TEXT}</p>
          <p className="mt-2">
            Posisjoner mellom AIS-meldinger er beregnet ut fra fart og kurs. Fyrvakt er et
            uoffisielt hobbyspill og er ikke tilknyttet Kystverket eller BarentsWatch. Må ikke
            brukes til navigasjon.
          </p>
        </section>
      </div>
    </dialog>
  )
}
