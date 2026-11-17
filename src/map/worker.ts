import { setWorkerUrl } from 'maplibre-gl'
// MapLibre 6 loads its worker relative to its own module URL, which a bundler moves.
// Vite emits the (self-contained) worker as a hashed asset and gives us its URL.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'

setWorkerUrl(workerUrl)
