import type { Map as MapLibreMap } from 'maplibre-gl'
import { CATEGORY_COLOR } from '../services/ais/shipTypes'
import type { VesselCategory } from '../types/vessel'

const PIXEL_RATIO = 2

function canvas(
  width: number,
  height: number,
): [HTMLCanvasElement, CanvasRenderingContext2D] | null {
  const c = document.createElement('canvas')
  c.width = width * PIXEL_RATIO
  c.height = height * PIXEL_RATIO
  const ctx = c.getContext('2d')
  if (!ctx) return null
  ctx.scale(PIXEL_RATIO, PIXEL_RATIO)
  return [c, ctx]
}

function add(map: MapLibreMap, id: string, c: HTMLCanvasElement): void {
  const ctx = c.getContext('2d')
  if (!ctx || map.hasImage(id)) return
  map.addImage(id, ctx.getImageData(0, 0, c.width, c.height), { pixelRatio: PIXEL_RATIO })
}

/** Pointed hull for moving vessels (pointing north, rotated by the map) and a ring for stationary ones. */
function drawShip(color: string, moving: boolean): HTMLCanvasElement | null {
  const made = canvas(28, 40)
  if (!made) return null
  const [c, ctx] = made
  ctx.lineJoin = 'round'
  ctx.strokeStyle = '#03101a'
  ctx.lineWidth = 2.5
  ctx.fillStyle = color
  if (moving) {
    ctx.beginPath()
    ctx.moveTo(14, 3)
    ctx.bezierCurveTo(21, 11, 22, 19, 22, 26)
    ctx.lineTo(22, 35)
    ctx.quadraticCurveTo(14, 38, 6, 35)
    ctx.lineTo(6, 26)
    ctx.bezierCurveTo(6, 19, 7, 11, 14, 3)
    ctx.closePath()
    ctx.stroke()
    ctx.fill()
    ctx.fillStyle = 'rgba(3,16,26,0.55)'
    ctx.fillRect(11, 22, 6, 7)
  } else {
    ctx.beginPath()
    ctx.arc(14, 20, 8, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fill()
    ctx.fillStyle = '#03101a'
    ctx.beginPath()
    ctx.arc(14, 20, 3, 0, Math.PI * 2)
    ctx.fill()
  }
  return c
}

function drawBadge(letter: string): HTMLCanvasElement | null {
  const made = canvas(26, 26)
  if (!made) return null
  const [c, ctx] = made
  ctx.fillStyle = '#04111c'
  ctx.strokeStyle = '#e8f1f5'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(2, 2, 22, 22, 7)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#e8f1f5'
  ctx.font = '700 14px "Chakra Petch", system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(letter, 13, 14)
  return c
}

export const FLEET_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] as const

/** Register all vessel and badge images on the map (idempotent). */
export function registerIcons(map: MapLibreMap): void {
  for (const [category, color] of Object.entries(CATEGORY_COLOR) as [VesselCategory, string][]) {
    const moving = drawShip(color, true)
    const still = drawShip(color, false)
    if (moving) add(map, `ship-${category}`, moving)
    if (still) add(map, `ship-${category}-still`, still)
  }
  for (const letter of FLEET_LETTERS) {
    const badge = drawBadge(letter)
    if (badge) add(map, `badge-${letter}`, badge)
  }
}
