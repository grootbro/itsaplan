import { test, expect } from '@playwright/test';
import { installFixture } from './fixture';

test('edits only changed fields once and returns to the issue', async ({ page }, testInfo) => {
  const fixture = await installFixture(page, { planning: true });
  await page.goto('/issue/1');
  await page.getByRole('button', { name: 'Edit issue', exact: true }).click();
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('A polished mobile task');
  await page
    .getByRole('textbox', { name: 'Description', exact: true })
    .fill('## Context\n\nUseful **details**.');
  await page.getByRole('button', { name: 'Preview description', exact: true }).click();
  await expect(page.getByText('Context', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('synthetic-phone-task-editor.png') });
  await page
    .getByRole('button', { name: 'Save changes', exact: true })
    .click({ clickCount: 2, delay: 10 });
  await expect(page).toHaveURL(/\/issue\/1$/);
  await expect(page.getByText('A polished mobile task', { exact: true })).toBeVisible();
  expect(fixture.patches).toEqual([
    { title: 'A polished mobile task', description: '## Context\n\nUseful **details**.' },
  ]);
  expect(fixture.failures).toEqual([]);
});

test('retains failed edits and prevents saving read-only tasks', async ({ page }) => {
  const fixture = await installFixture(page, { saveFailure: true });
  await page.goto('/edit-issue/1');
  const title = page.getByRole('textbox', { name: 'Title', exact: true });
  await title.fill('Keep this draft');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByText('Synthetic validation failed', { exact: true })).toBeVisible();
  await expect(title).toHaveValue('Keep this draft');
  expect(fixture.writes()).toBe(1);
  expect(fixture.failures).toEqual([]);
});

test('creates with member assignee and distinguishes agents as delegates', async ({ page }) => {
  const fixture = await installFixture(page);
  await page.goto('/new-issue/alpha.PLAN');
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('A new mobile task');
  await page.getByRole('button', { name: 'Assignee: Fixture user', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Fixture agent', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page
    .getByRole('button', { name: 'Create issue', exact: true })
    .click({ clickCount: 2, delay: 10 });
  await expect(page).toHaveURL(/\/issue\/99$/);
  expect(fixture.writes()).toBe(1);
  expect(fixture.failures).toEqual([]);
});

test('posts formatted comments once and keeps the discussion visible after resizing', async ({
  page,
}, testInfo) => {
  const fixture = await installFixture(page);
  await page.goto('/issue/1');
  await page.getByRole('button', { name: 'Comment', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Comment text', exact: true })
    .fill('A **useful** comment.');
  await page.getByRole('button', { name: 'Preview comment text', exact: true }).click();
  await expect(page.getByText('useful', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Post comment', exact: true })
    .click({ clickCount: 2, delay: 10 });
  await expect(page.getByRole('heading', { name: 'New comment', exact: true })).toHaveCount(0);
  expect(fixture.writes()).toBe(1);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.getByText('useful', { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('synthetic-ipad-discussion.png') });
  expect(fixture.failures).toEqual([]);
});

test('preserves upload metadata and continues after a rejected file', async ({ page }) => {
  const fixture = await installFixture(page, { uploadFailure: true });
  await page.goto('/issue/1');
  await page.evaluate(() => {
    window.fixtureFiles = [
      {
        uri: 'file:///cache/random-one',
        name: 'Design notes',
        mimeType: 'application/pdf',
        size: 12,
      },
      {
        uri: 'file:///cache/random-two',
        name: 'Accepted notes',
        mimeType: 'application/pdf',
        size: 12,
      },
    ];
  });
  await page.getByRole('button', { name: 'Add files', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Open Accepted notes', exact: true })).toBeVisible();
  await expect(page.getByText('Design notes · Failed', { exact: true })).toBeVisible();
  expect(fixture.uploads).toEqual([
    { filename: 'Design notes', contentType: 'application/pdf' },
    { filename: 'Accepted notes', contentType: 'application/pdf' },
  ]);
  expect(fixture.failures).toEqual([]);
});

test('keeps read-only editors locked at phone and split-window widths', async ({ page }) => {
  const fixture = await installFixture(page, { readonly: true });
  await page.goto('/edit-issue/1');
  await expect(page.getByRole('textbox', { name: 'Title', exact: true })).not.toBeEditable();
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeDisabled();
  await page.setViewportSize({ width: 580, height: 800 });
  await expect(page.getByRole('textbox', { name: 'Description', exact: true })).not.toBeEditable();
  expect(fixture.writes()).toBe(0);
  expect(fixture.failures).toEqual([]);
});

test('protects unsaved changes on Back and allows an explicit discard', async ({ page }) => {
  const fixture = await installFixture(page);
  await page.goto('/issue/1');
  await page.getByRole('button', { name: 'Edit issue', exact: true }).click();
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Unsaved title');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Fixture back', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(
    'Unsaved title',
  );
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Fixture back', exact: true }).click();
  await expect(page).toHaveURL(/\/issue\/1$/);
  await page.goForward();
  await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(
    'Plan the mobile release',
  );
  expect(fixture.writes()).toBe(0);
  expect(fixture.failures).toEqual([]);
});
