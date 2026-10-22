import { test, expect } from '@playwright/test';
import { installFixture } from './fixture';

test('opens cycles from the project menu and returns through an issue to the searched cycle list', async ({
  page,
}) => {
  const fixture = await installFixture(page, { planning: true });
  await page.goto('/project/alpha.PLAN');
  await page.getByRole('button', { name: 'Project menu and switcher', exact: true }).click();
  await page.getByRole('button', { name: 'Open cycles', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search loaded cycles', exact: true }).fill('October');
  await page.getByRole('button', { name: 'Open October delivery', exact: true }).click();
  await expect(page.getByText('Ship a tested mobile release.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^PLAN-1, Plan the mobile release,/ }).click();
  await expect(page.getByText('formatted text', { exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByText('Ship a tested mobile release.', { exact: true })).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole('textbox', { name: 'Search loaded cycles', exact: true }),
  ).toHaveValue('October');
  expect(fixture.failures).toEqual([]);
});

test('loads another completed cycle page instead of silently truncating the archive', async ({
  page,
}) => {
  const fixture = await installFixture(page, { planning: true });
  await page.goto('/planning/alpha.PLAN?kind=cycles');
  await page.getByRole('button', { name: 'Show cycles: Completed', exact: true }).click();
  const more = page.getByRole('button', { name: 'Load more', exact: true });
  await more.scrollIntoViewIfNeeded();
  await more.click();
  await expect(page.getByText('26 shown · 26 total', { exact: true })).toBeAttached();
  await expect(more).toHaveCount(0);
  expect(fixture.failures).toEqual([]);
});

test('searches the full paginated initiative collection and creates an initiative once', async ({
  page,
}, testInfo) => {
  const fixture = await installFixture(page, { planning: true });
  await page.goto('/planning/alpha.PLAN?kind=initiatives');
  await page
    .getByRole('textbox', { name: 'Search initiatives', exact: true })
    .fill('Initiative 26');
  await expect(page.getByRole('button', { name: 'Open Initiative 26', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New initiative', exact: true }).click();
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('New mobile initiative');
  await page
    .getByRole('textbox', { name: 'Description', exact: true })
    .fill('A real native form with synthetic API data.');
  await page
    .getByRole('button', { name: 'Save initiative', exact: true })
    .click({ clickCount: 2, delay: 10 });
  await expect(
    page.getByRole('heading', { name: 'New mobile initiative', exact: true }),
  ).toBeVisible();
  expect(fixture.writes()).toBe(1);
  await page.screenshot({ path: testInfo.outputPath('synthetic-phone-initiative.png') });
  expect(fixture.failures).toEqual([]);
});

test('switches same-key projects through the real menu and hides disabled project sections', async ({
  page,
}) => {
  const fixture = await installFixture(page);
  await page.goto('/project/alpha.PLAN');
  await page.getByRole('button', { name: 'Project menu and switcher', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open cycles', exact: true })).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Find project or team', exact: true }).fill('beta');
  await page
    .getByRole('button', { name: 'Switch to beta team, beta project', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'PLAN-1, beta Plan the mobile release', exact: true }),
  ).toBeVisible();
  expect(fixture.failures).toEqual([]);
});

test('keeps planning details readable without mutation permission', async ({ page }) => {
  const fixture = await installFixture(page, { planning: true, readonly: true });
  await page.goto('/planning-detail/initiatives/1?key=alpha.PLAN');
  await expect(page.getByRole('heading', { name: 'Mobile delivery', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit initiative', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Actions for PLAN-1', exact: true })).toHaveCount(
    0,
  );
  expect(fixture.writes()).toBe(0);
  expect(fixture.failures).toEqual([]);
});
