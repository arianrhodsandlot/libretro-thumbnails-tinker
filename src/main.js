import { JSDOM } from 'jsdom'
import { Libretrodb } from 'libretrodb'
import { map, sortBy, uniqBy } from 'lodash-es'
import { exitBrowser } from './browser.js'
import { chooseThumbnail } from './choose-thumbnail.js'
import { normalizePathName } from './utils.js'

async function getMissingGameNames() {
  const system = process.env.ROM_SYSTEM

  const db = await Libretrodb.from(`libretro/database-rdb/${system}.rdb`)
  const entries = sortBy(uniqBy(db.getEntries(), 'name'), 'name')

  const thumbnailIndexUrl = `https://thumbnails.libretro.com/${encodeURIComponent(system)}/Named_Snaps/`
  const dom = await JSDOM.fromURL(thumbnailIndexUrl)
  const links = dom.window.document.querySelectorAll('a:not([href^=".."])')
  const existingImages = new Set(map(links, (link) => decodeURIComponent(link.getAttribute('href') ?? '')))

  const missingGameNames = []
  for (const { name } of entries) {
    if (name) {
      const normalizedName = normalizePathName(name)
      if (!existingImages.has(`${normalizedName}.png`)) {
        missingGameNames.push(name)
      }
    }
  }
  return missingGameNames
}

export async function main() {
  const missingGameNames = await getMissingGameNames()

  for (const gameName of missingGameNames) {
    await chooseThumbnail(gameName)
  }

  await exitBrowser()
}
