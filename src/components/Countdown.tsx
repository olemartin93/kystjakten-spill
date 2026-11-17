export function Countdown({ value, prompt }: { value: number; prompt: string }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-40 grid place-items-center bg-abyss/50"
      aria-hidden="true"
    >
      <div className="text-center">
        <p className="label-caps mb-3 text-beacon">{prompt}</p>
        <p
          key={value}
          className="font-display text-[7rem] leading-none font-bold text-foam drop-shadow-[0_0_30px_rgb(62_230_193/0.5)] motion-safe:animate-count"
        >
          {value}
        </p>
      </div>
    </div>
  )
}
