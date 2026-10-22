import { test, expect } from '@playwright/test';
import { installFixture } from './fixture';

test('opens a shared web view, keeps base filters through reset and task return', async ({
  page,
}, info) => {
  const fixture = await installFixture(page, { views: true });
  await page.goto('/project/alpha.PLAN?savedView=1');
  await expect(page.getByRole('button', { name: 'Table view', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('button', { name: /^Open PLAN-1, / })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Open PLAN-2, / })).toHaveCount(0);
  await page
    .getByRole('textbox', { name: 'Search issues', exact: true })
    .fill('Plan the mobile release');
  await page.screenshot({ path: info.outputPath('synthetic-phone-saved-view.png') });
  await page.getByRole('button', { name: /^Open PLAN-1, / }).click();
  await expect(page.getByText('formatted text', { exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('textbox', { name: 'Search issues', exact: true })).toHaveValue(
    'Plan the mobile release',
  );
  await page
    .getByRole('button', { name: 'Reset filters and show all active issues', exact: true })
    .click();
  await expect(page.getByRole('button', { name: /^Open PLAN-2, / })).toHaveCount(0);
  expect(fixture.viewWrites).toEqual([]);
  expect(fixture.failures).toEqual([]);
});

test('allows a reader to star views while hiding shared edit actions', async ({ page }) => {
  const fixture = await installFixture(page, { views: true, readonly: true });
  await page.goto('/project/alpha.PLAN?savedView=1');
  await page.getByRole('button', { name: 'Saved views', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Rename High priority', exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole('button', { name: 'Save current view as…', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Star High priority', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Unstar High priority', exact: true }),
  ).toBeVisible();
  expect(fixture.viewWrites).toEqual([{ method: 'PUT', path: '/views/1/favorite', body: null }]);
});

test('renames only the name and preserves opaque web metadata', async ({ page }, info) => {
  const fixture = await installFixture(page, { views: true });
  const before = JSON.stringify(fixture.savedViews[0].display);
  await page.setViewportSize({ width: 1194, height: 834 });
  await page.goto('/project/alpha.PLAN?savedView=1');
  await page.getByRole('button', { name: 'Saved views', exact: true }).click();
  await page.screenshot({ path: info.outputPath('synthetic-ipad-saved-views.png') });
  await page.getByRole('button', { name: 'Rename High priority', exact: true }).click();
  await page.getByRole('textbox', { name: 'View name', exact: true }).fill('Team focus');
  await page.getByRole('button', { name: 'Save view', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Open saved view Team focus', exact: true }),
  ).toBeVisible();
  expect(fixture.viewWrites).toEqual([
    { method: 'PATCH', path: '/views/1', body: { name: 'Team focus' } },
  ]);
  expect(JSON.stringify(fixture.savedViews[0].display)).toBe(before);
});

test('blocks an unsupported active condition and failed view reads without broadening', async ({
  page,
}) => {
  await installFixture(page, { views: true });
  await page.goto('/project/alpha.PLAN?savedView=2');
  await expect(page.getByText('Saved view unavailable', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Open PLAN-/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'All project issues', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Board view', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('creates a compatible snapshot and rejects omitted search text', async ({ page }) => {
  const fixture = await installFixture(page, { views: true });
  await page.goto('/project/alpha.PLAN?layout=table');
  await page.getByRole('textbox', { name: 'Search issues', exact: true }).fill('important');
  await page.getByRole('button', { name: 'Saved views', exact: true }).click();
  await page.getByRole('button', { name: 'Save current view as…', exact: true }).click();
  await page.getByRole('textbox', { name: 'View name', exact: true }).fill('Daily work');
  await page.getByRole('button', { name: 'Save view', exact: true }).click();
  await expect(
    page.getByText(
      'Clear text search before saving. The web saved-view format does not store search text.',
      { exact: true },
    ),
  ).toBeVisible();
  expect(fixture.viewWrites).toEqual([]);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Clear search', exact: true }).click();
  await page.getByRole('button', { name: 'Saved views', exact: true }).click();
  await page.getByRole('button', { name: 'Save current view as…', exact: true }).click();
  await page.getByRole('textbox', { name: 'View name', exact: true }).fill('Daily work');
  await page.getByRole('button', { name: 'Save view', exact: true }).click();
  await expect(page).toHaveURL(/savedView=3/);
  expect(fixture.viewWrites).toHaveLength(1);
  expect(fixture.viewWrites[0]).toMatchObject({
    method: 'POST',
    body: { name: 'Daily work', filters: { conditions: [] }, display: { layout: 'table' } },
  });
});

test('requires explicit deletion confirmation and returns to All after deleting selected view', async ({
  page,
}) => {
  const fixture = await installFixture(page, { views: true });
  await page.goto('/project/alpha.PLAN?savedView=1');
  await page.getByRole('button', { name: 'Saved views', exact: true }).click();
  await page.getByRole('button', { name: 'Delete High priority', exact: true }).click();
  expect(fixture.viewWrites).toEqual([]);
  await page.getByRole('button', { name: 'Delete shared view', exact: true }).click();
  await expect(page).not.toHaveURL(/savedView=/);
  expect(fixture.viewWrites).toEqual([{ method: 'DELETE', path: '/views/1', body: null }]);
  expect(fixture.writes()).toBe(0);
});

test('shows a failed saved-view request and recovers to project overview', async ({ page }) => {
  await installFixture(page, { views: true, viewsFailure: true });
  await page.goto('/project/alpha.PLAN?savedView=1');
  await expect(page.getByText('Saved view unavailable', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Open PLAN-/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'All project issues', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Board view', exact: true })).toBeVisible();
});
