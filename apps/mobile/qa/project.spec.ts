import { test, expect } from '@playwright/test';
import { installFixture } from './fixture';

test('switches all views with shared filters and restores persisted choices', async ({ page }) => {
  const fixture = await installFixture(page);
  await page.goto('/project/alpha.PLAN');
  await expect(page.getByRole('button', { name: 'Board view', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page
    .getByRole('textbox', { name: 'Search issues', exact: true })
    .fill('Plan the mobile release');
  for (const layout of ['List', 'Table', 'Calendar', 'Timeline', 'Board']) {
    await page.getByRole('button', { name: `${layout} view`, exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Search issues', exact: true })).toHaveValue(
      'Plan the mobile release',
    );
  }
  await page.getByRole('button', { name: 'Table view', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Table view', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('textbox', { name: 'Search issues', exact: true })).toHaveValue(
    'Plan the mobile release',
  );
  expect(fixture.failures).toEqual([]);
});

test('returns from a full issue with filters and layout intact, including browser history', async ({
  page,
}) => {
  const fixture = await installFixture(page);
  await page.goto('/project/alpha.PLAN');
  await page.getByRole('button', { name: 'Table view', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Search issues', exact: true })
    .fill('Plan the mobile release');
  await page
    .getByRole('button', { name: 'Open PLAN-1, Plan the mobile release', exact: true })
    .click();
  await expect(page.getByText('formatted text', { exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('textbox', { name: 'Search issues', exact: true })).toHaveValue(
    'Plan the mobile release',
  );
  await expect(page.getByRole('button', { name: 'Table view', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.goForward();
  await expect(page.getByText('formatted text', { exact: true })).toBeVisible();
  expect(fixture.failures).toEqual([]);
});

test('keeps selected details through tablet resize and restores the board on close', async ({
  page,
}, testInfo) => {
  const fixture = await installFixture(page);
  await page.setViewportSize({ width: 1194, height: 834 });
  await page.goto('/project/alpha.PLAN');
  await page.getByRole('button', { name: 'PLAN-1, Plan the mobile release', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Close issue', exact: true })).toBeVisible();
  await expect(page.getByText('formatted text', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('synthetic-tablet-detail.png') });
  await page.setViewportSize({ width: 600, height: 834 });
  await expect(page.getByRole('button', { name: 'Back to list', exact: true })).toBeVisible();
  await expect(page.getByText('formatted text', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to list', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Board view', exact: true })).toBeVisible();
  expect(fixture.failures).toEqual([]);
});

test('shows loading, an outage with retry, empty columns and no-match recovery', async ({
  page,
}) => {
  const fixture = await installFixture(page, { fail: true, delay: 800 });
  await page.goto('/project/alpha.PLAN');
  await expect(page.getByRole('progressbar')).toBeVisible();
  await expect(page.getByText('Project unavailable', { exact: true })).toBeVisible();
  fixture.options.fail = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Board view', exact: true })).toBeVisible();
  await expect(page.getByText('No issues in this column', { exact: true })).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Search issues', exact: true })
    .fill('no such synthetic issue');
  await expect(
    page.getByText('No issues match the current filters.', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Reset filters and show all active issues', exact: true })
    .click();
  await expect(page.getByRole('textbox', { name: 'Search issues', exact: true })).toHaveValue('');
  expect(fixture.failures).toEqual([]);
});

test('edits status once and refreshes the board through the real API client', async ({ page }) => {
  const fixture = await installFixture(page);
  await page.goto('/project/alpha.PLAN');
  await page.getByRole('button', { name: 'Actions for PLAN-1', exact: true }).click();
  const status = page.getByRole('button', { name: 'Status: Done', exact: true });
  await status.click({ clickCount: 2, delay: 10 });
  await expect(page.getByText('Saving…', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Status: Done', exact: true })).toHaveCount(0);
  await expect(page.getByText('Saving…', { exact: true })).toHaveCount(0);
  expect(fixture.writes()).toBe(1);
  expect(fixture.failures).toEqual([]);
});

test('retains access to unscheduled calendar tasks and month selection after return', async ({
  page,
}) => {
  await installFixture(page);
  await page.goto('/project/alpha.PLAN');
  await page.getByRole('button', { name: 'Calendar view', exact: true }).click();
  await page.getByRole('button', { name: 'Next month', exact: true }).click();
  const month = await page
    .getByRole('heading')
    .filter({ hasText: /20\d{2}/ })
    .first()
    .innerText();
  await page.getByRole('button', { name: 'Unscheduled · 10', exact: true }).click();
  await page.getByRole('button', { name: /^PLAN-1, Plan the mobile release/ }).click();
  await expect(page.getByText('formatted text', { exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Selected day', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: month, exact: true })).toBeVisible();
});

test('separates equal project keys and conceals mutations without edit permission', async ({
  page,
}) => {
  const fixture = await installFixture(page, { readonly: true });
  await page.goto('/project/alpha.PLAN');
  await page.getByRole('button', { name: 'List view', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search issues', exact: true }).fill('alpha only');
  await page.goto('/project/beta.PLAN');
  await expect(page.getByRole('textbox', { name: 'Search issues', exact: true })).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Board view', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('button', { name: 'Actions for PLAN-1', exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByRole('button', { name: 'Create issue', exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'PLAN-1, beta Plan the mobile release', exact: true }),
  ).toBeVisible();
  expect(fixture.writes()).toBe(0);
  expect(fixture.failures).toEqual([]);
});

test('restores a horizontally scrolled board after opening and returning from an issue', async ({
  page,
}) => {
  await installFixture(page);
  await page.goto('/project/alpha.PLAN');
  const card = page.getByRole('button', { name: 'PLAN-2, Synthetic task 2', exact: true });
  await card.scrollIntoViewIfNeeded();
  const offset = await card.evaluate((element) => {
    let parent = element.parentElement;
    while (parent && parent.scrollWidth <= parent.clientWidth + 1) parent = parent.parentElement;
    if (!parent) throw new Error('No horizontal board scroll container');
    return parent.scrollLeft;
  });
  expect(offset).toBeGreaterThan(0);
  await page.waitForTimeout(150);
  await card.click();
  await expect(page.getByText('formatted text', { exact: true })).toBeVisible();
  await page.goBack();
  await expect(card).toBeVisible();
  await expect
    .poll(() =>
      card.evaluate((element) => {
        let parent = element.parentElement;
        while (parent && parent.scrollWidth <= parent.clientWidth + 1)
          parent = parent.parentElement;
        return parent?.scrollLeft ?? 0;
      }),
    )
    .toBeGreaterThan(Math.max(0, offset - 20));
});

test('renders an empty project in phone dark mode', async ({ page }, testInfo) => {
  await installFixture(page, { empty: true });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/project/alpha.PLAN');
  await expect(page.getByText('No issues in this column', { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('synthetic-phone-dark-empty.png') });
});
