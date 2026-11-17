import { useCallback, useEffect, useState } from 'react'
import type { LatLng } from '../types/vessel'

export type LocationStatus =
  'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable' | 'unsupported'

export interface GeolocationState {
  status: LocationStatus
  position: LatLng | null
}

const supported = (): boolean => typeof navigator !== 'undefined' && 'geolocation' in navigator

/**
 * Browser geolocation with friendly states. Asks only when `request()` is called (from a user
 * gesture), but picks the position up silently if permission was granted on an earlier visit.
 */
export function useGeolocation(): GeolocationState & { request: () => Promise<LatLng | null> } {
  const [state, setState] = useState<GeolocationState>(() => ({
    status: supported() ? 'idle' : 'unsupported',
    position: null,
  }))

  const request = useCallback((): Promise<LatLng | null> => {
    if (!supported()) {
      setState({ status: 'unsupported', position: null })
      return Promise.resolve(null)
    }
    setState((s) => ({ ...s, status: 'requesting' }))
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const position = { latitude: pos.coords.latitude, longitude: pos.coords.longitude }
          setState({ status: 'granted', position })
          resolve(position)
        },
        (error) => {
          setState({
            status: error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable',
            position: null,
          })
          resolve(null)
        },
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
      )
    })
  }, [])

  useEffect(() => {
    if (!supported() || !('permissions' in navigator)) return
    let cancelled = false
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((result) => {
        if (cancelled) return
        if (result.state === 'granted') void request()
        else if (result.state === 'denied') setState({ status: 'denied', position: null })
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [request])

  return { ...state, request }
}
