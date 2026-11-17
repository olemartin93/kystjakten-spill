// Renders public/logo.svg to the PNG icons used by the PWA manifest and iOS.
// Uses the Playwright/Chromium available in the dev environment: `npm run icons`.
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const svg = await readFile(resolve('public/logo.svg'), 'utf8')
const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`

const targets = [
  { file: 'public/icons/icon-192.png', size: 192, maskable: false },
  { file: 'public/icons/icon-512.png', size: 512, maskable: false },
  { file: 'public/icons/apple-touch-icon.png', size: 180, maskable: true },
  { file: 'public/icons/icon-maskable-512.png', size: 512, maskable: true },
]

const browser = await chromium.launch()
const page = await browser.newPage()
for (const { file, size, maskable } of targets) {
  await page.setViewportSize({ width: size, height: size })
  const inner = maskable ? size * 0.8 : size
  const offset = (size - inner) / 2
  await page.setContent(
    `<html><body style="margin:0;background:${maskable ? '#04111c' : 'transparent'}">` +
      `<img src="${dataUri}" style="position:absolute;left:${offset}px;top:${offset}px;width:${inner}px;height:${inner}px"></body></html>`,
  )
  await page.screenshot({ path: file, omitBackground: !maskable })
  console.log(`wrote ${file}`)
}
await browser.close()
