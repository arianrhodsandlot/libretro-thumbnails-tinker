import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { launchBrowser } from './browser.js'
import { normalizePathName } from './utils.js'

const currentFilePath = fileURLToPath(import.meta.url)
const currentFileDir = path.dirname(currentFilePath)

const currentWorkingDir = process.cwd()

async function launchEmulatorPage(romPath) {
  const browser = await launchBrowser()
  const page = await browser.newPage()
  await page.bringToFront()
  const fileInput = page.locator('input')

  await page.goto('about:blank')

  await page.evaluate(`window.core = '${process.env.EMULATOR_CORE}'`)
  await page.evaluate(`window.width = +'${process.env.EMULATOR_WIDTH}'`)
  await page.evaluate(`window.height = +'${process.env.EMULATOR_HEIGHT}'`)

  await page.setContent(fs.readFileSync(path.join(currentFileDir, 'libretro-thumbnails-tinker.html'), 'utf8'))
  await page.waitForLoadState('networkidle')

  const fileChooserPromise = page.waitForEvent('filechooser')

  await Promise.all([fileInput.click(), fileChooserPromise.then((fileChooser) => fileChooser.setFiles(romPath))])
  return page
}

async function listenPageActions({ page, titlePath, snapPath }) {
  await new Promise((resolve) => {
    page.on('console', async (messages) => {
      if (messages.type() !== 'log') {
        return
      }

      const [messageHandle] = messages.args()
      const message = messageHandle.toString()
      const canvas = page.locator('canvas')

      if (message === 'title') {
        await canvas.screenshot({ path: titlePath })
      }
      if (message === 'snap') {
        await canvas.screenshot({ path: snapPath })
      }
      if (message === 'close') {
        await page.close()
        resolve()
      }
    })
  })
}

export async function chooseThumbnail(name) {
  const system = process.env.ROM_SYSTEM
  const romDir = process.env.ROM_DIR
  const romPath = path.join(romDir, `${name}.zip`)

  if (!fs.existsSync(romPath)) {
    return
  }
  const titlePath = path.resolve(
    currentWorkingDir,
    `libretro/thumbnails/${normalizePathName(system)}/Named_Titles/${normalizePathName(name)}.png`,
  )
  const snapPath = path.resolve(
    currentWorkingDir,
    `libretro/thumbnails/${normalizePathName(system)}/Named_Snaps/${normalizePathName(name)}.png`,
  )

  if (fs.existsSync(titlePath) !== fs.existsSync(snapPath)) {
    console.warn(name)
  }

  if (fs.existsSync(titlePath) && fs.existsSync(snapPath)) {
    return
  }

  const page = await launchEmulatorPage(romPath)
  await listenPageActions({ page, titlePath, snapPath })
}
