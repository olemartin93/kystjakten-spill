import 'maplibre-gl/dist/maplibre-gl.css'
import './worker'
import type { GeoJSONSource, Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl'
import { AttributionControl, Map as MapLibre, Marker, NavigationControl } from 'maplibre-gl'
import { useEffect, useRef, useState } from 'react'
import { AIS_ATTRIBUTION } from '../config/mapConfig'
import { projectPosition } from '../services/ais/normalize'
import type { LatLng, Vessel } from '../types/vessel'
import type { FleetMarker } from './features'
import { boundsOf, fleetFeatures, ringFeatures, trafficFeatures, vectorFeatures } from './features'
import { registerIcons } from './icons'
import { addGameLayers, FLEET_SOURCE, RING_SOURCE, TRAFFIC_SOURCE, VECTOR_SOURCE } from './layers'
import { SEACHART_LAYER_ID, SEACHART_SOURCE_ID } from './style'
import { createMapStyle } from './style'

export interface CameraPadding {
  top: number
  bottom: number
  left: number
  right: number
}

export interface MapViewProps {
  center: LatLng
  playerPosition: LatLng | null
  traffic: Vessel[]
  fleet: FleetMarker[]
  target: LatLng | null
  /** Changing this re-frames the camera around the fleet/target. */
  focusKey: string
  padding: CameraPadding
  showSeaChart: boolean
  reducedMotion: boolean
  onPick?: (vesselId: string) => void
  onSeaChartError?: () => void
  onMapUnavailable?: () => void
}

/** Max distance (CSS px) from a tap to a vessel for it to count as a hit – generous for thumbs. */
const HIT_RADIUS_PX = 34
const UPDATE_INTERVAL_MS = 1000

export function MapView(props: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const [ready, setReady] = useState(false)
  const propsRef = useRef(props)
  useEffect(() => {
    propsRef.current = props
  })

  // Create the map once.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let map: MapLibreMap
    try {
      map = new MapLibre({
        container,
        style: createMapStyle(),
        center: [propsRef.current.center.longitude, propsRef.current.center.latitude],
        zoom: 9.5,
        minZoom: 3,
        maxZoom: 15,
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        fadeDuration: 0,
      })
    } catch {
      propsRef.current.onMapUnavailable?.()
      return
    }
    mapRef.current = map
    if (import.meta.env.DEV) Object.assign(window, { __fyrvaktMap: map })
    map.touchZoomRotate.disableRotation()
    map.keyboard.disableRotation()
    map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right')
    map.addControl(
      new AttributionControl({ compact: true, customAttribution: AIS_ATTRIBUTION }),
      'bottom-right',
    )

    map.on('load', () => {
      registerIcons(map)
      addGameLayers(map)
      setReady(true)
    })
    map.on('error', (event) => {
      const sourceId = (event as unknown as { sourceId?: string }).sourceId
      if (sourceId === SEACHART_SOURCE_ID) propsRef.current.onSeaChartError?.()
    })

    const nearestFleetVessel = (e: MapMouseEvent): string | null => {
      const { fleet } = propsRef.current
      let best: { id: string; d: number } | null = null
      const now = Date.now()
      for (const { vessel, state } of fleet) {
        if (state === 'dimmed') continue
        const p = projectPosition(vessel, now)
        const screen = map.project([p.longitude, p.latitude])
        const d = Math.hypot(screen.x - e.point.x, screen.y - e.point.y)
        if (d <= HIT_RADIUS_PX && (!best || d < best.d)) best = { id: vessel.id, d }
      }
      return best?.id ?? null
    }
    map.on('click', (e) => {
      const id = nearestFleetVessel(e)
      if (id) propsRef.current.onPick?.(id)
    })
    map.on('mousemove', (e) => {
      map.getCanvas().style.cursor =
        propsRef.current.onPick && nearestFleetVessel(e) ? 'pointer' : ''
    })

    return () => {
      mapRef.current = null
      setReady(false)
      map.remove()
    }
  }, [])

  // Live data: refresh positions (dead reckoning) every second.
  const { fleet, traffic, target } = props
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    const update = () => {
      const now = Date.now()
      void map.getSource<GeoJSONSource>(FLEET_SOURCE)?.setData(fleetFeatures(fleet, now))
      const vectorVessels = fleet.filter((m) => m.state !== 'dimmed').map((m) => m.vessel)
      void map.getSource<GeoJSONSource>(VECTOR_SOURCE)?.setData(vectorFeatures(vectorVessels, now))
      void map.getSource<GeoJSONSource>(TRAFFIC_SOURCE)?.setData(trafficFeatures(traffic, now))
    }
    update()
    const timer = window.setInterval(update, UPDATE_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [ready, fleet, traffic])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    void map.getSource<GeoJSONSource>(RING_SOURCE)?.setData(ringFeatures(target, target ? 3 : 0))
  }, [ready, target])

  // Target buoy marker.
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map || !target) return
    const el = document.createElement('div')
    el.className = 'buoy-marker'
    el.setAttribute('aria-hidden', 'true')
    const marker = new Marker({ element: el })
      .setLngLat([target.longitude, target.latitude])
      .addTo(map)
    return () => {
      marker.remove()
    }
  }, [ready, target])

  // Player position marker.
  const { playerPosition } = props
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map || !playerPosition) return
    const el = document.createElement('div')
    el.className = 'player-marker'
    el.setAttribute('aria-hidden', 'true')
    const marker = new Marker({ element: el })
      .setLngLat([playerPosition.longitude, playerPosition.latitude])
      .addTo(map)
    return () => {
      marker.remove()
    }
  }, [ready, playerPosition])

  // Camera: frame the round's fleet (and buoy), or fly to the play area center.
  const { focusKey, center } = props
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    const { padding, reducedMotion } = propsRef.current
    const now = Date.now()
    const points = fleet.map((m) => projectPosition(m.vessel, now))
    if (target) points.push(target)
    const bounds = boundsOf(points)
    const duration = reducedMotion ? 0 : 1200
    // easeTo/fitBounds padding is persistent and additive in MapLibre – always start from zero.
    map.setPadding({ top: 0, bottom: 0, left: 0, right: 0 })
    if (bounds && points.length > 1) {
      map.fitBounds(bounds, { padding, maxZoom: 13, duration })
    } else {
      const offsetX = (padding.left - padding.right) / 2
      const offsetY = (padding.top - padding.bottom) / 2
      map.easeTo({
        center: [center.longitude, center.latitude],
        zoom: 10,
        duration,
        offset: [offsetX, offsetY],
      })
    }
    // Only re-frame when the focus key changes, not on every fleet state update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, focusKey])

  const { showSeaChart } = props
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map?.getLayer(SEACHART_LAYER_ID)) return
    map.setLayoutProperty(SEACHART_LAYER_ID, 'visibility', showSeaChart ? 'visible' : 'none')
  }, [ready, showSeaChart])

  return (
    // MapLibre's stylesheet makes its container position: relative, so it gets its own wrapper.
    <div className="absolute inset-0 bg-sea-950">
      <div
        ref={containerRef}
        className="h-full w-full"
        role="region"
        data-map-ready={ready}
        aria-label="Sjøkart med skip. Bruk fartøylisten eller bokstavtastene for å velge med tastatur."
      />
    </div>
  )
}
