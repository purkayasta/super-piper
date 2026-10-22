import { expect, test, type Page } from '@playwright/test';

const HEAP_GROWTH_LIMIT_BYTES = 5 * 1024 * 1024;
const MENU_CYCLES = 20;
const GC_PASSES = 3;
const RAPID_CYCLES = 10;

let consoleErrors: string[];
let pageErrors: string[];

test.beforeEach(({ page }) => {
  consoleErrors = [];
  pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
});

test.afterEach(() => {
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

const playLink = (page: Page) => page.getByRole('link', { name: 'Play' });
const menuLink = (page: Page) => page.getByRole('link', { name: 'Menu' });

async function playThenMenu(page: Page) {
  await playLink(page).click();
  await expect(page.locator('canvas')).toHaveCount(1);
  await menuLink(page).click();
  await expect(page.locator('canvas')).toHaveCount(0);
}

async function collectedHeapBytes(page: Page) {
  const session = await page.context().newCDPSession(page);
  await session.send('HeapProfiler.enable');
  for (let pass = 0; pass < GC_PASSES; pass++) {
    await session.send('HeapProfiler.collectGarbage');
    await page.waitForTimeout(100);
  }
  await session.detach();
  return page.evaluate(
    () => (performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize,
  );
}

test('menu to play shows exactly one canvas', async ({ page }) => {
  await page.goto('/#/play/sandbox');
  await expect(page.locator('canvas')).toHaveCount(1);
});

test('twenty play-menu cycles leave one canvas and bounded heap', async ({ page }) => {
  await page.goto('/#/');
  await playThenMenu(page);
  const heapBefore = await collectedHeapBytes(page);

  for (let cycle = 0; cycle < MENU_CYCLES; cycle++) await playThenMenu(page);

  const heapAfter = await collectedHeapBytes(page);
  await expect(page.locator('canvas')).toHaveCount(0);
  console.log(`heap growth over ${MENU_CYCLES} cycles: ${heapAfter - heapBefore} bytes`);
  expect(heapAfter - heapBefore).toBeLessThan(HEAP_GROWTH_LIMIT_BYTES);
});

test('rapid toggling during boot leaves one canvas', async ({ page }) => {
  await page.goto('/#/');
  for (let cycle = 0; cycle < RAPID_CYCLES; cycle++) {
    await playLink(page).click();
    await menuLink(page).click();
  }
  await playLink(page).click();
  await page.waitForTimeout(1000);
  await expect(page.locator('canvas')).toHaveCount(1);
});

test('resize recomputes canvas size', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/#/play/sandbox');
  await expect(page.locator('canvas')).toHaveAttribute('width', '1296');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect(page.locator('canvas')).toHaveAttribute('width', '2160');
});

test('dpi change recomputes canvas size', async ({ page }) => {
  await page.addInitScript(() => {
    const recorded: { media: string; query: MediaQueryList }[] = [];
    (window as unknown as { recordedMediaQueries: typeof recorded }).recordedMediaQueries =
      recorded;
    const realMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = (media: string) => {
      const query = realMatchMedia(media);
      recorded.push({ media, query });
      return query;
    };
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/#/play/sandbox');
  await expect(page.locator('canvas')).toHaveAttribute('width', '1296');
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 720,
    deviceScaleFactor: 2,
    mobile: false,
  });
  await expect.poll(() => page.evaluate(() => window.devicePixelRatio)).toBe(2);
  // CDP's deviceScaleFactor override updates matches but never dispatches the change event.
  const dispatched = await page.evaluate(() => {
    const recorded = (
      window as unknown as { recordedMediaQueries: { media: string; query: MediaQueryList }[] }
    ).recordedMediaQueries;
    const resolutionQueries = recorded.filter(({ media }) => media.startsWith('(resolution:'));
    resolutionQueries.forEach(({ query }) => query.dispatchEvent(new Event('change')));
    return resolutionQueries.map(({ media }) => media);
  });
  expect(dispatched).toEqual(['(resolution: 1dppx)']);
  await expect(page.locator('canvas')).toHaveAttribute('width', '2592');
  await session.detach();
});

test('canvas uses smooth browser scaling for the final fit', async ({ page }) => {
  await page.goto('/#/play/sandbox');
  await expect(page.locator('canvas')).toHaveCSS('image-rendering', 'auto');
});
