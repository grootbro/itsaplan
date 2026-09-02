import { describe, it, expect, beforeEach } from 'bun:test';
import { authedApi, type Api } from '#tests/helpers/app';
import { signUpTestUser } from '#tests/helpers/auth';
import { resetDb } from '#tests/helpers/db';
import { db } from '@repo/db';
import { sql } from 'drizzle-orm';

// Issue templates are the presets a new issue can be created from. They belong to
// a project, and every property they preset is optional. Routes live under
// /projects/:projectKey/issue-templates, so the permission guard runs on
// :projectKey and the service scopes every template to that project. The project
// scaffold (GET /projects/:projectKey) carries the list the create dialog reads.

// Treaty maps the hyphenated segment as a bracketed accessor.
function templates(client: Api, projectKey = 'MKT') {
  return client.projects({ projectKey })['issue-templates'];
}

// A project plus the ids of the pieces a template can preset.
async function setupProject() {
  const owner = await signUpTestUser();
  const asOwner = authedApi(owner.cookie);
  await asOwner.projects.post({ key: 'MKT', name: 'Marketing' });
  const scaffold = (await asOwner.projects({ projectKey: 'MKT' }).get()).data!;
  const label = (await asOwner.projects({ projectKey: 'MKT' }).labels.post({ name: 'bug' })).data!;
  const type = (await asOwner.projects({ projectKey: 'MKT' })['issue-types'].post({ name: 'Bug' }))
    .data!;
  return {
    asOwner,
    ownerUserId: owner.userId,
    columnId: scaffold.columns[0].id,
    labelId: label.id,
    typeId: type.id,
  };
}

async function listTemplates(client: Api, projectKey = 'MKT') {
  return (await templates(client, projectKey).get()).data!;
}

// Fail the label write after API validation, without mocking the database. NOT
// VALID leaves existing labels intact, so an update must roll back its DELETE too.
async function withFailingLabelWrite(run: () => Promise<void>): Promise<void> {
  await db.execute(sql`
    ALTER TABLE issue_template_label
    ADD CONSTRAINT test_reject_template_labels CHECK (false) NOT VALID
  `);
  try {
    await run();
  } finally {
    await db.execute(sql`
      ALTER TABLE issue_template_label DROP CONSTRAINT test_reject_template_labels
    `);
  }
}

describe('issue-templates', () => {
  beforeEach(async () => {
    await resetDb();
  });

  describe('create', () => {
    it('rolls back the template when saving its labels fails and allows a retry', async () => {
      const { asOwner, labelId } = await setupProject();
      const input = { name: 'Bug report', labelIds: [labelId] };

      await withFailingLabelWrite(async () => {
        expect((await templates(asOwner).post(input)).status).toBe(500);
        expect(await listTemplates(asOwner)).toEqual([]);
      });

      const retry = await templates(asOwner).post(input);
      expect(retry.status).toBe(201);
      expect(retry.data).toMatchObject(input);
    });

    it('creates a template with only a name and presets nothing', async () => {
      const { asOwner } = await setupProject();

      const created = await templates(asOwner).post({ name: 'Bug report' });
      expect(created.status).toBe(201);
      expect(created.data).toMatchObject({
        name: 'Bug report',
        description: '',
        titleTemplate: '',
        descriptionTemplate: '',
        typeId: null,
        columnId: null,
        priority: null,
        assigneeUserId: null,
        labelIds: [],
      });

      expect((await listTemplates(asOwner)).map((t) => t.name)).toEqual(['Bug report']);
    });

    it('stores every preset it is given', async () => {
      const { asOwner, ownerUserId, columnId, labelId, typeId } = await setupProject();

      const created = await templates(asOwner).post({
        name: 'Scraper fix',
        description: 'For a broken scraper',
        titleTemplate: 'Fix scraper',
        descriptionTemplate: '## Steps\n1.',
        typeId,
        columnId,
        priority: 'high',
        assigneeUserId: ownerUserId,
        labelIds: [labelId],
      });
      expect(created.status).toBe(201);
      expect(created.data).toMatchObject({
        name: 'Scraper fix',
        description: 'For a broken scraper',
        titleTemplate: 'Fix scraper',
        descriptionTemplate: '## Steps\n1.',
        typeId,
        columnId,
        priority: 'high',
        assigneeUserId: ownerUserId,
        labelIds: [labelId],
      });
    });

    it('rejects an empty name', async () => {
      const { asOwner } = await setupProject();
      expect((await templates(asOwner).post({ name: '' })).status).toBe(400);
    });

    it('rejects a name the project already uses', async () => {
      const { asOwner } = await setupProject();
      await templates(asOwner).post({ name: 'Bug report' });
      expect((await templates(asOwner).post({ name: 'Bug report' })).status).toBe(409);
    });

    it('rejects a preset that belongs to another project', async () => {
      const { asOwner } = await setupProject();
      await asOwner.projects.post({ key: 'OPS', name: 'Ops' });
      const other = (await asOwner.projects({ projectKey: 'OPS' }).get()).data!;

      const created = await templates(asOwner).post({
        name: 'Cross project',
        columnId: other.columns[0].id,
      });
      expect(created.status).toBe(400);
    });

    it('rejects an assignee who is not a project member', async () => {
      const { asOwner } = await setupProject();
      const outsider = await signUpTestUser();

      const created = await templates(asOwner).post({
        name: 'Outsider',
        assigneeUserId: outsider.userId,
      });
      expect(created.status).toBe(400);
    });
  });

  describe('read', () => {
    it('hides templates in the scaffold when the member cannot read them', async () => {
      const { asOwner } = await setupProject();
      const input = { name: 'Internal', descriptionTemplate: 'Restricted template content' };
      await templates(asOwner).post(input);
      const member = await signUpTestUser();
      const invite = await asOwner.projects({ projectKey: 'MKT' }).invites.post({
        email: member.email,
        role: 'member',
      });
      const asMember = authedApi(member.cookie);
      expect((await asMember.invites({ token: invite.data!.token }).accept.post()).status).toBe(
        200,
      );
      const role = await asOwner.projects({ projectKey: 'MKT' }).roles.post({
        name: 'No templates',
        permissions: { work_items: { read: true, create: true } },
      });
      expect(
        (
          await asOwner.projects({ projectKey: 'MKT' }).members({ userId: member.userId }).patch({
            role: 'member',
            roleId: role.data!.id,
          })
        ).status,
      ).toBe(204);

      expect((await templates(asMember).get()).status).toBe(403);
      const denied = await asMember.projects({ projectKey: 'MKT' }).get();
      expect(denied.status).toBe(200);
      expect(denied.data?.issueTemplates).toEqual([]);

      await asOwner
        .projects({ projectKey: 'MKT' })
        .roles({ roleId: role.data!.id })
        .patch({
          permissions: { issue_templates: { read: true } },
        });
      expect((await templates(asMember).get()).status).toBe(200);
      const allowed = await asMember.projects({ projectKey: 'MKT' }).get();
      expect(allowed.status).toBe(200);
      expect(allowed.data?.issueTemplates).toMatchObject([input]);
    });

    it('lists the project templates on the project scaffold', async () => {
      const { asOwner, labelId } = await setupProject();
      await templates(asOwner).post({ name: 'Bug report', labelIds: [labelId] });

      const scaffold = (await asOwner.projects({ projectKey: 'MKT' }).get()).data!;
      expect(scaffold.issueTemplates).toMatchObject([{ name: 'Bug report', labelIds: [labelId] }]);
    });

    it('does not list a template of another project', async () => {
      const { asOwner } = await setupProject();
      await asOwner.projects.post({ key: 'OPS', name: 'Ops' });
      await templates(asOwner).post({ name: 'Bug report' });

      expect(await listTemplates(asOwner, 'OPS')).toEqual([]);
    });
  });

  describe('update', () => {
    it('rolls back both properties and previous labels when replacement fails', async () => {
      const { asOwner, labelId } = await setupProject();
      const original = { name: 'Bug report', titleTemplate: 'Bug', labelIds: [labelId] };
      const created = (await templates(asOwner).post(original)).data!;
      const other = (await asOwner.projects({ projectKey: 'MKT' }).labels.post({ name: 'chore' }))
        .data!;
      const patch = { name: 'Chore', titleTemplate: 'Cleanup', labelIds: [other.id] };

      await withFailingLabelWrite(async () => {
        expect((await templates(asOwner)({ templateId: created.id }).patch(patch)).status).toBe(
          500,
        );
        expect(await listTemplates(asOwner)).toMatchObject([{ id: created.id, ...original }]);
      });

      const retry = await templates(asOwner)({ templateId: created.id }).patch(patch);
      expect(retry.status).toBe(200);
      expect(retry.data).toMatchObject(patch);
    });

    it('allows explicitly clearing all labels', async () => {
      const { asOwner, labelId } = await setupProject();
      const created = (await templates(asOwner).post({ name: 'Bug', labelIds: [labelId] })).data!;
      const updated = await templates(asOwner)({ templateId: created.id }).patch({ labelIds: [] });
      expect(updated.status).toBe(200);
      expect(updated.data?.labelIds).toEqual([]);
    });

    it('keeps the properties the patch leaves out', async () => {
      const { asOwner, typeId } = await setupProject();
      const created = (await templates(asOwner).post({ name: 'Bug report', typeId })).data!;

      const updated = await templates(asOwner)({ templateId: created.id }).patch({
        name: 'Bug',
      });
      expect(updated.status).toBe(200);
      expect(updated.data).toMatchObject({ name: 'Bug', typeId });
    });

    it('clears a preset set to null', async () => {
      const { asOwner, typeId } = await setupProject();
      const created = (await templates(asOwner).post({ name: 'Bug report', typeId })).data!;

      const updated = await templates(asOwner)({ templateId: created.id }).patch({ typeId: null });
      expect(updated.data).toMatchObject({ typeId: null });
    });

    it('replaces the whole label set', async () => {
      const { asOwner, labelId } = await setupProject();
      const other = (await asOwner.projects({ projectKey: 'MKT' }).labels.post({ name: 'chore' }))
        .data!;
      const created = (await templates(asOwner).post({ name: 'Bug report', labelIds: [labelId] }))
        .data!;

      const updated = await templates(asOwner)({ templateId: created.id }).patch({
        labelIds: [other.id],
      });
      expect(updated.data).toMatchObject({ labelIds: [other.id] });
    });

    it('answers 404 for a template of another project', async () => {
      const { asOwner } = await setupProject();
      await asOwner.projects.post({ key: 'OPS', name: 'Ops' });
      const created = (await templates(asOwner).post({ name: 'Bug report' })).data!;

      const updated = await templates(
        asOwner,
        'OPS',
      )({ templateId: created.id }).patch({
        name: 'Moved',
      });
      expect(updated.status).toBe(404);
    });
  });

  describe('delete', () => {
    it('deletes a template', async () => {
      const { asOwner } = await setupProject();
      const created = (await templates(asOwner).post({ name: 'Bug report' })).data!;

      expect((await templates(asOwner)({ templateId: created.id }).delete()).status).toBe(204);
      expect(await listTemplates(asOwner)).toEqual([]);
    });

    it('answers 404 for a template that does not exist', async () => {
      const { asOwner } = await setupProject();
      expect((await templates(asOwner)({ templateId: 987654 }).delete()).status).toBe(404);
    });

    it('keeps the template when a label it presets is deleted', async () => {
      const { asOwner, labelId } = await setupProject();
      const created = (await templates(asOwner).post({ name: 'Bug report', labelIds: [labelId] }))
        .data!;

      await asOwner.projects({ projectKey: 'MKT' }).labels({ labelId }).delete();

      const list = await listTemplates(asOwner);
      expect(list).toMatchObject([{ id: created.id, labelIds: [] }]);
    });
  });

  describe('access', () => {
    it('denies a non-member on every issue-templates route', async () => {
      const { asOwner } = await setupProject();
      const created = (await templates(asOwner).post({ name: 'Bug report' })).data!;
      const outsider = authedApi((await signUpTestUser()).cookie);

      // Guard-thrown 403 is not in Treaty's inferred error-status union, so assert
      // on the top-level status.
      expect((await templates(outsider).get()).status).toBe(403);
      expect((await templates(outsider).post({ name: 'X' })).status).toBe(403);
      expect(
        (await templates(outsider)({ templateId: created.id }).patch({ name: 'X' })).status,
      ).toBe(403);
      expect((await templates(outsider)({ templateId: created.id }).delete()).status).toBe(403);
    });
  });
});
