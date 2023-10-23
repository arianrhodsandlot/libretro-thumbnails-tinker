import path from 'node:path'
import process from 'node:process'
import { chromium } from 'playwright'

const currentWorkingDir = process.cwd()

const playwrightUserDataDir = path.join(currentWorkingDir, 'playwright-user-data-dir')
/** @type {import('playwright').BrowserContext} */
let browser

export async function launchBrowser() {
  browser ??= await chromium.launchPersistentContext(playwrightUserDataDir, {
    headless: false,
    timeout: 0,
    viewport: {
      width: 50 + Number.parseInt(process.env.EMULATOR_WIDTH, 10),
      height: 150 + Number.parseInt(process.env.EMULATOR_HEIGHT, 10),
    },
  })
  return browser
}

export async function exitBrowser() {
  if (browser) {
    await browser.close()
  }
}
