/** External map services. Change here to swap providers. */
export const OPENFREEMAP_TILEJSON = 'https://tiles.openfreemap.org/planet'
export const OPENFREEMAP_GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf'
export const OPENFREEMAP_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'

/** Kartverket's open WMTS cache – the official Norwegian nautical chart (CC BY 4.0). */
export const KARTVERKET_SEACHART_TILES =
  'https://cache.kartverket.no/v1/wmts/1.0.0/sjokartraster/default/webmercator/{z}/{y}/{x}.png'
export const KARTVERKET_ATTRIBUTION =
  'Sjøkart © <a href="https://www.kartverket.no/" target="_blank" rel="noopener">Kartverket</a>'

export const AIS_ATTRIBUTION =
  'AIS-data © <a href="https://www.kystverket.no/" target="_blank" rel="noopener">Kystverket</a> via <a href="https://www.barentswatch.no/" target="_blank" rel="noopener">BarentsWatch</a> (NLOD)'

/** Speed vectors show where a vessel will be in this many minutes (radar convention). */
export const VECTOR_MINUTES = 6
