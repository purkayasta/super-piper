import { expect, test, type Page } from '@playwright/test';

const HEAP_GROWTH_LIMIT_BYTES = 5 * 1024 * 1024;
const MENU_CYCLES = 20;
const GC_PASSES = 3;
const RAPID_CYCLES = 10;
const PIP_CAP_COLOR = [0x22, 0xb3, 0xc8] as const;
const COLOR_TOLERANCE = 24;
const HOLD_RIGHT_MS = 1000;
const MIN_SCREEN_TRAVEL_CSS_PX = 60;

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
const deliverButton = (page: Page) => page.getByTestId('play-stage');
const pauseButton = (page: Page) => page.getByTestId('pause');
const quitButton = (page: Page) => page.getByTestId('quit');
const backLink = (page: Page) => page.getByRole('link', { name: 'Back' });

async function startFirstStage(page: Page) {
  await playLink(page).click();
  await deliverButton(page).click();
}

async function playThenMenu(page: Page) {
  await startFirstStage(page);
  await expect(page.locator('canvas')).toHaveCount(1);
  await pauseButton(page).click();
  await quitButton(page).click();
  await expect(page.locator('canvas')).toHaveCount(0);
  await backLink(page).click();
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

async function pipScreenX(page: Page): Promise<number | null> {
  const png = await page.locator('canvas').screenshot();
  return page.evaluate(
    async ({ base64, cap, tolerance }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d')!;
      context.drawImage(image, 0, 0);
      const { data, width } = context.getImageData(0, 0, image.width, image.height);
      let sum = 0;
      let count = 0;
      for (let index = 0; index < data.length; index += 4) {
        const matches =
          Math.abs(data[index] - cap[0]) <= tolerance &&
          Math.abs(data[index + 1] - cap[1]) <= tolerance &&
          Math.abs(data[index + 2] - cap[2]) <= tolerance;
        if (!matches) continue;
        sum += (index / 4) % width;
        count++;
      }
      return count > 0 ? sum / count : null;
    },
    { base64: png.toString('base64'), cap: PIP_CAP_COLOR, tolerance: COLOR_TOLERANCE },
  );
}

test('menu to play shows exactly one canvas', async ({ page }) => {
  await page.goto('/#/play/test-room');
  await expect(page.locator('canvas')).toHaveCount(1);
});

test('the sandbox stage still loads', async ({ page }) => {
  await page.goto('/#/play/sandbox');
  await expect(page.locator('canvas')).toHaveCount(1);
});

test('holding ArrowRight moves Pip to the right', async ({ page }) => {
  await page.goto('/#/play/test-room');
  await expect.poll(() => pipScreenX(page), { timeout: 15_000 }).not.toBeNull();
  const startX = (await pipScreenX(page))!;

  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(HOLD_RIGHT_MS);
  await page.keyboard.up('ArrowRight');

  const endX = (await pipScreenX(page))!;
  console.log(`Pip screen travel after ${HOLD_RIGHT_MS}ms: ${endX - startX} css px`);
  expect(endX - startX).toBeGreaterThan(MIN_SCREEN_TRAVEL_CSS_PX);
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
  await playLink(page).click();
  for (let cycle = 0; cycle < RAPID_CYCLES; cycle++) {
    await deliverButton(page).click();
    await page.goBack();
  }
  await deliverButton(page).click();
  await page.waitForTimeout(1000);
  await expect(page.locator('canvas')).toHaveCount(1);
});

test('resize recomputes canvas size', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/#/play/test-room');
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
  await page.goto('/#/play/test-room');
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
  await page.goto('/#/play/test-room');
  await expect(page.locator('canvas')).toHaveCSS('image-rendering', 'auto');
});
