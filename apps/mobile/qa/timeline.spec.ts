import { test, expect } from '@playwright/test';
import { installFixture } from './fixture';

test('opens interval details and restores scale, groups and search on return', async ({
  page,
}, testInfo) => {
  const fixture = await installFixture(page);
  await page.goto('/project/alpha.PLAN?layout=timeline');
  await expect(page.getByRole('button', { name: 'Timeline view', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('button', { name: 'Timeline scale: quarter', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Search issues', exact: true })
    .fill('Plan the mobile release');
  await page.getByRole('button', { name: 'Collapse In progress, 0 issues', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('synthetic-phone-timeline.png') });
  await page.getByRole('button', { name: /^Open interval for PLAN-1,/ }).click();
  await expect(page.getByText('formatted text', { exact: true })).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole('button', { name: 'Timeline scale: quarter', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await expect(
    page.getByRole('button', { name: 'Expand In progress, 0 issues', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Search issues', exact: true })).toHaveValue(
    'Plan the mobile release',
  );
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Timeline scale: quarter', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  expect(fixture.failures).toEqual([]);
});

test('preserves horizontal position and keeps issue labels visible while panning', async ({
  page,
}) => {
  const fixture = await installFixture(page);
  await page.goto('/project/alpha.PLAN?layout=timeline');
  await page
    .getByRole('textbox', { name: 'Search issues', exact: true })
    .fill('Plan the mobile release');
  const pan = async () =>
    page.evaluate(() => {
      const node = [...document.querySelectorAll<HTMLElement>('*')].find(
        (element) =>
          getComputedStyle(element).overflowX === 'auto' &&
          element.scrollWidth > element.clientWidth + 30 &&
          !!element.querySelector('[aria-label^="Open interval for PLAN-"]'),
      );
      if (!node) throw new Error('Timeline horizontal viewport unavailable');
      node.scrollLeft = 200;
      node.dispatchEvent(new Event('scroll'));
      return node.scrollLeft;
    });
  await expect(
    page.getByRole('button', { name: /^Open PLAN-1, Plan the mobile release,/ }),
  ).toBeVisible();
  const savedOffset = await pan();
  expect(savedOffset).toBeGreaterThan(30);
  await page.waitForTimeout(150);
  const label = page.getByRole('button', { name: /^Open PLAN-1, Plan the mobile release,/ });
  const bounds = await label.boundingBox();
  expect(bounds?.x).toBeLessThan(80);
  expect(bounds?.x).toBeGreaterThanOrEqual(0);
  await label.click();
  await expect(page.getByText('formatted text', { exact: true })).toBeVisible();
  await page.goBack();
  await expect
    .poll(() =>
      page.evaluate(() =>
        Math.max(
          ...[...document.querySelectorAll<HTMLElement>('*')]
            .filter(
              (element) =>
                !!element.querySelector('[aria-label^="Open interval for PLAN-"]') &&
                getComputedStyle(element).overflowX === 'auto',
            )
            .map((element) => element.scrollLeft),
        ),
      ),
    )
    .toBeGreaterThan(savedOffset - 10);
  expect(fixture.failures).toEqual([]);
});

test('shows empty timeline state and recovers after clearing a shared search', async ({ page }) => {
  const fixture = await installFixture(page);
  await page.goto('/project/alpha.PLAN?layout=timeline');
  await page.getByRole('textbox', { name: 'Search issues', exact: true }).fill('not-a-task');
  await expect(page.getByText('No matching issues', { exact: true }).first()).toBeVisible();
  await page.getByRole('textbox', { name: 'Search issues', exact: true }).fill('');
  await expect(
    page.getByRole('button', { name: /^Open PLAN-27, Synthetic task 27,/ }),
  ).toBeVisible();
  expect(fixture.failures).toEqual([]);
});

test('keeps undated tasks visible by creation and never exposes read-only actions', async ({
  page,
}) => {
  const fixture = await installFixture(page, { readonly: true, timeline: true });
  await page.goto('/project/alpha.PLAN?layout=timeline');
  await page
    .getByRole('textbox', { name: 'Search issues', exact: true })
    .fill('Plan the mobile release');
  await expect(
    page.getByRole('button', { name: /^Open PLAN-1, Plan the mobile release,/ }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Actions for PLAN-1', exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole('button', { name: /start inferred from creation$/ }).first(),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Go to today in timeline', exact: true }).click();
  expect(fixture.writes()).toBe(0);
  expect(fixture.failures).toEqual([]);
});

test('keeps task detail and timeline through iPad split-window changes', async ({
  page,
}, testInfo) => {
  const fixture = await installFixture(page);
  await page.setViewportSize({ width: 1194, height: 834 });
  await page.goto('/project/alpha.PLAN?layout=timeline');
  await page
    .getByRole('textbox', { name: 'Search issues', exact: true })
    .fill('Plan the mobile release');
  await page.getByRole('button', { name: /^Open PLAN-1, Plan the mobile release,/ }).click();
  await expect(page.getByRole('button', { name: 'Close issue', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('synthetic-ipad-timeline-detail.png') });
  await page.setViewportSize({ width: 580, height: 834 });
  await page.getByRole('button', { name: 'Back to list', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Timeline view', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(
    page.getByRole('button', { name: /^Open PLAN-1, Plan the mobile release,/ }),
  ).toBeVisible();
  expect(fixture.failures).toEqual([]);
});

test('reaches older tasks by vertical scrolling and restores that position', async ({ page }) => {
  const fixture = await installFixture(page);
  await page.goto('/project/alpha.PLAN?layout=timeline');
  const first = page.getByRole('button', { name: /^Open PLAN-27, Synthetic task 27,/ });
  await expect(first).toBeVisible();
  const savedOffset = await first.evaluate((element) => {
    let node = element.parentElement;
    while (
      node &&
      !(getComputedStyle(node).overflowY === 'auto' && node.scrollHeight > node.clientHeight + 100)
    )
      node = node.parentElement;
    if (!node) throw new Error('Timeline vertical viewport unavailable');
    node.scrollTop = 1100;
    node.dispatchEvent(new Event('scroll'));
    return node.scrollTop;
  });
  const older = page.getByRole('button', { name: /^Open PLAN-1, Plan the mobile release,/ });
  await expect(older).toBeVisible();
  await older.click();
  await expect(page.getByText('formatted text', { exact: true })).toBeVisible();
  await page.goBack();
  await expect(older).toBeVisible();
  await expect
    .poll(() =>
      older.evaluate((element) => {
        let node = element.parentElement;
        while (
          node &&
          !(
            getComputedStyle(node).overflowY === 'auto' &&
            node.scrollHeight > node.clientHeight + 100
          )
        )
          node = node.parentElement;
        return node?.scrollTop ?? 0;
      }),
    )
    .toBeGreaterThan(savedOffset - 20);
  expect(fixture.failures).toEqual([]);
});
