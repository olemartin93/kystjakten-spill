import type { Challenge } from '../game/types'

export function ObjectiveCard({ challenge }: { challenge: Challenge }) {
  return (
    <section
      key={challenge.id}
      aria-labelledby="objective"
      className="pointer-events-auto rounded-2xl border border-beacon/40 bg-sea-950/90 px-4 py-3 shadow-[0_0_30px_-10px_rgb(255_194_75/0.45)] backdrop-blur motion-safe:animate-rise"
    >
      <p className="label-caps text-[0.62rem] text-beacon">Oppdrag · {challenge.title}</p>
      <h2 id="objective" className="mt-0.5 font-display text-xl leading-snug font-bold sm:text-2xl">
        {challenge.prompt}
      </h2>
      <p className="mt-1 text-sm text-mist">{challenge.hint}</p>
    </section>
  )
}
