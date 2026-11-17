/** Always-visible data and map credits (MapLibre's own attribution control is hidden on phones). */
export function MapCredits({ className = '' }: { className?: string }) {
  return (
    <p className={`text-[0.68rem] leading-tight text-mist ${className}`}>
      AIS:{' '}
      <a
        className="underline-offset-2 hover:underline"
        href="https://www.kystverket.no/"
        target="_blank"
        rel="noopener noreferrer"
      >
        Kystverket
      </a>{' '}
      via{' '}
      <a
        className="underline-offset-2 hover:underline"
        href="https://www.barentswatch.no/"
        target="_blank"
        rel="noopener noreferrer"
      >
        BarentsWatch
      </a>{' '}
      (NLOD) · Kart:{' '}
      <a
        className="underline-offset-2 hover:underline"
        href="https://openfreemap.org"
        target="_blank"
        rel="noopener noreferrer"
      >
        OpenFreeMap
      </a>{' '}
      ©{' '}
      <a
        className="underline-offset-2 hover:underline"
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noopener noreferrer"
      >
        OpenStreetMap
      </a>
    </p>
  )
}
