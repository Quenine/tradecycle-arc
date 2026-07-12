import { expect, test, type Page, type TestInfo } from "@playwright/test"

const routes = [
  "/", "/admin", "/credit-passport",
  "/credit-passport/0x99210566b55816D453AcEA907A149E7134EE4446",
  "/demo", "/faucet", "/funding", "/how-it-works", "/market", "/operator",
  "/operator/dashboard", "/portfolio", "/stats", "/submission", "/verifier",
] as const

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
] as const

const mojibake = /\uFFFD|\u00C3|\u00C2|\u00E2[\u0080-\u00BF]|\u00F0[\u0080-\u00BF]/u
const legacyBrand = /\b(?:Fundr|FUNDr)\b|\bfundr\b/iu
const badAddress = /\b(?:undefined|null)\b\s*(?:contract\s*)?address|address\s*[:=]\s*(?:undefined|null)/iu
const providerUrl = /(?:walletconnect|web3modal|infura|alchemy|quicknode|rpc|coinbase|metamask|reown)/iu
const assetType = /^(?:image|font|script|stylesheet)$/

type Diagnostics = {
  consoleErrors: string[]
  pageErrors: string[]
  failedRequests: string[]
  badResponses: string[]
  providerWarnings: string[]
  benignPrefetchAborts: string[]
}

function monitor(page: Page): Diagnostics {
  const result: Diagnostics = { consoleErrors: [], pageErrors: [], failedRequests: [], badResponses: [], providerWarnings: [], benignPrefetchAborts: [] }
  const classify = (message: string, target: string[]) =>
    (providerUrl.test(message) ? result.providerWarnings : target).push(message)
  page.on("console", msg => {
    if (msg.type() === "error" && !/^Failed to load resource:/i.test(msg.text())) classify(msg.text(), result.consoleErrors)
  })
  page.on("pageerror", error => classify(error.message, result.pageErrors))
  page.on("requestfailed", request => {
    const failure = request.failure()?.errorText ?? "failed"
    const headers = request.headers()
    const url = new URL(request.url())
    const isRsc = url.searchParams.has("_rsc") || headers.rsc === "1"
    const isPrefetch = headers.purpose === "prefetch" || "next-router-prefetch" in headers || isRsc || request.method() === "HEAD"
    const requiredAsset = /^(?:document|script|stylesheet|font|image)$/.test(request.resourceType())
    const message = `${request.method()} ${url.origin}${url.pathname} — ${failure}`
    if (failure === "net::ERR_ABORTED" && isPrefetch && !requiredAsset) result.benignPrefetchAborts.push(message)
    else classify(message, result.failedRequests)
  })
  page.on("response", response => {
    if (response.status() < 400) return
    const request = response.request()
    const message = `${response.status()} ${request.resourceType()} ${response.url()}`
    if (providerUrl.test(message)) result.providerWarnings.push(message)
    else if (assetType.test(request.resourceType()) || new URL(response.url()).origin === new URL(page.url()).origin) result.badResponses.push(message)
  })
  return result
}

async function assertHealthy(page: Page, route: string, info: TestInfo) {
  const diagnostics = monitor(page)
  const response = await page.goto(route, { waitUntil: "domcontentloaded" })
  expect(response, `No navigation response for ${route}`).not.toBeNull()
  expect(response!.status(), `Unexpected status for ${route}`).toBeLessThan(400)
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined)

  const body = page.locator("body")
  const bodyText = (await body.innerText()).trim()
  expect(bodyText.length, `Blank or non-meaningful body at ${route}`).toBeGreaterThan(40)
  expect(mojibake.test(bodyText), `Mojibake rendered at ${route}: ${bodyText.match(mojibake)?.[0]}`).toBe(false)
  expect(legacyBrand.test(bodyText), `Legacy product name rendered at ${route}`).toBe(false)
  expect(badAddress.test(bodyText), `Invalid contract address rendered at ${route}`).toBe(false)
  expect(bodyText).not.toMatch(/Application error|Internal Server Error|DEPLOYMENT_NOT_FOUND|This page could not be found/i)
  expect(await page.locator("nextjs-portal").count(), "Next.js error overlay is present").toBe(0)

  await expect(body, `Main page content hidden at ${route}`).toBeVisible()
  expect(bodyText, `TradeCycle branding missing at ${route}`).toMatch(/TradeCycle/i)
  await expect(page.locator('nav span[style*="--emerald"]'), `Arc Testnet indicator missing at ${route}`).toBeVisible()
  expect(bodyText, `Wallet control or disconnected guidance missing at ${route}`).toMatch(/Connect(?:\s+Wallet)?|wallet/i)

  const invalidHrefs = await page.locator("a").evaluateAll(links => links.flatMap(link => {
    const href = link.getAttribute("href")?.trim()
    return !href || href === "#" || /^javascript:/i.test(href) || /(?:undefined|null)/i.test(href) ? [href ?? "<missing>"] : []
  }))
  expect(invalidHrefs, `Invalid navigation hrefs at ${route}`).toEqual([])

  const layout = await page.evaluate(() => {
    const root = document.documentElement
    const vw = root.clientWidth
    const overflow = Math.max(root.scrollWidth, document.body.scrollWidth) - vw
    const clippedControls = [...document.querySelectorAll<HTMLElement>("a,button,input,select,textarea")]
      .filter(el => {
        const style = getComputedStyle(el)
        if (style.display === "none" || style.visibility === "hidden") return false
        const rect = el.getBoundingClientRect()
        const insideLocalScroller = !!el.parentElement?.closest(".table-scroll, [style*=\"overflow-x\"]")
        return !insideLocalScroller && rect.width > 0 && rect.height > 0 && (rect.left < -1 || rect.right > vw + 1)
      }).map(el => (el.innerText || el.getAttribute("aria-label") || el.tagName).slice(0, 80))
    const escapedAddresses = [...document.querySelectorAll<HTMLElement>("*")].filter(el => /^0x[a-fA-F0-9]{20,}$/.test((el.textContent ?? "").trim()) && el.children.length === 0)
      .filter(el => el.scrollWidth > el.clientWidth + 1).map(el => (el.textContent ?? "").slice(0, 24))
    const overflowingElements = [...document.querySelectorAll<HTMLElement>("body *")].map(el => {
      const rect = el.getBoundingClientRect(); return { selector: `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${[...el.classList].slice(0,2).map(c => `.${c}`).join("")}`, left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width), scrollWidth: el.scrollWidth, text: (el.innerText || "").trim().slice(0,60) }
    }).filter(item => item.right > vw + 1 || item.left < -1).sort((a,b) => b.right - a.right).slice(0,8)
    return { overflow, clippedControls, escapedAddresses, overflowingElements }
  })
  expect(layout.overflow, `Horizontal document overflow at ${route}: ${JSON.stringify(layout.overflowingElements)}`).toBeLessThanOrEqual(1)
  expect(layout.clippedControls, `Controls clipped at ${route}`).toEqual([])
  expect(layout.escapedAddresses, `Addresses escape containers at ${route}`).toEqual([])

  await info.attach("diagnostics", { body: JSON.stringify(diagnostics, null, 2), contentType: "application/json" })
  expect(diagnostics.pageErrors, `Uncaught page errors at ${route}`).toEqual([])
  expect(diagnostics.consoleErrors, `Console errors at ${route}`).toEqual([])
  expect(diagnostics.failedRequests, `Non-provider failed requests at ${route}`).toEqual([])
  expect(diagnostics.badResponses, `Failed same-origin/assets at ${route}`).toEqual([])
}

for (const viewport of viewports) {
  test.describe(`${viewport.name} ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })
    for (const route of routes) {
      test(`${route} is release healthy`, async ({ page }, info) => assertHealthy(page, route, info))
    }
  })
}

test("discovers and opens a valid dynamic cycle", async ({ page }, info) => {
  test.setTimeout(120_000)
  for (const source of ["/credit-passport/0x99210566b55816D453AcEA907A149E7134EE4446", "/market", "/operator/dashboard", "/portfolio"]) {
    await page.goto(source, { waitUntil: "domcontentloaded" })
    const cycleLink = page.locator('a[href^="/cycle/0x"]').first()
    const href = await cycleLink.getAttribute("href", { timeout: 12_000 }).catch(() => null)
    if (href && /^\/cycle\/0x[a-fA-F0-9]{40}$/.test(href)) {
      await assertHealthy(page, href, info)
      await info.attach("cycle-route", { body: href, contentType: "text/plain" })
      return
    }
  }
  const claimsCycles = await page.locator("body").innerText().then(text => /active cycle|cycles available|view cycle/i.test(text))
  throw new Error(claimsCycles
    ? "The app claims cycles exist, but no reachable /cycle/0x… link was found"
    : "No valid cycle link was discoverable from market, operator dashboard, or portfolio")
})

test("invalid route renders the intended not-found experience", async ({ page }) => {
  const response = await page.goto("/release-qa-intentionally-missing", { waitUntil: "domcontentloaded" })
  expect(response?.status()).toBe(404)
  await expect(page.locator("body")).toContainText(/not found|could not be found|404/i)
  expect((await page.locator("body").innerText()).trim().length).toBeGreaterThan(20)
})

test("admin is safe and clear while disconnected", async ({ page }) => {
  const diagnostics = monitor(page)
  await page.goto("/admin", { waitUntil: "networkidle" })
  const text = await page.locator("body").innerText()
  expect(text).toMatch(/connect.*wallet|wallet.*connect/i)
  expect(text).not.toMatch(mojibake)
  expect(diagnostics.pageErrors).toEqual([])
  expect(diagnostics.consoleErrors).toEqual([])
})

test("desktop navigation exposes every permitted destination", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/")
  const desktopNav = page.locator(".desktop-nav")
  await expect(desktopNav).toBeVisible()
  for (const route of routes.filter(route => !route.includes("0x") && route !== "/admin" && !route.startsWith("/cycle"))) {
    if (route === "/credit-passport" || route === "/funding" || route === "/submission" || route === "/operator/dashboard") continue
    await expect(desktopNav.locator(`a[href="${route}"]`)).toBeVisible()
  }
})

test("mobile navigation opens, exposes links, closes after navigation and on Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/")
  const menu = page.locator(".mobile-menu-button")
  await menu.click()
  await expect(menu).toHaveAttribute("aria-expanded", "true")
  const panel = page.locator("#mobile-navigation")
  for (const href of ["/", "/market", "/portfolio", "/operator", "/verifier", "/faucet", "/demo", "/how-it-works", "/stats"]) await expect(panel.locator(`a[href="${href}"]`)).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(panel).toHaveCount(0)
  await menu.click()
  await panel.locator('a[href="/market"]').click()
  await expect(page).toHaveURL(/\/market$/)
  await expect(page.locator("#mobile-navigation")).toHaveCount(0)
})
test("cycle route validates invalid and no-bytecode addresses in-page", async ({ page }) => {
  await page.goto("/cycle/not-an-address")
  await expect(page.getByRole("heading", { name: "Invalid cycle address" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Back to Explore" })).toBeVisible()
  await page.goto("/cycle/0x0000000000000000000000000000000000000001")
  await expect(page.getByRole("heading", { name: "Cycle unavailable" })).toBeVisible()
  await expect(page.locator("body")).not.toContainText(/This page couldn.t load/i)
})