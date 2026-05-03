/**
 * server/routes/whitelabel.ts — D5: White-label branding configuration.
 * Per-workspace branding settings (logo, colours, domain, email footer, etc.)
 * Stored in workspace.settings JSON column.
 */
import { Router } from 'express';
import { db }     from '../db.js';
import { workspaces } from '../../shared/schema.js';
import { eq }     from 'drizzle-orm';
import { ok }     from '../lib/validate.js';
import { requireWorkspace } from '../lib/auth-session.js';
import { getWorkspaceId, getUserId } from '../lib/workspace-guard.js';
import { writeAudit } from '../lib/audit.js';
import { z }      from 'zod';

const router = Router();

const BrandingSchema = z.object({
  companyDisplayName: z.string().min(1).max(120).optional(),
  primaryColor:       z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  accentColor:        z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  logoUrl:            z.string().url().max(500).optional().or(z.literal('')),
  faviconUrl:         z.string().url().max(500).optional().or(z.literal('')),
  supportEmail:       z.string().email().max(200).optional(),
  customDomain:       z.string().max(200).optional().or(z.literal('')),
  emailFooter:        z.string().max(1000).optional(),
  hideIntegritySolveBranding: z.boolean().optional(),
  reportWatermark:    z.string().max(80).optional(),
}).strict();

const DEFAULT_BRANDING = {
  companyDisplayName:             '',
  primaryColor:                   '#10B981',
  accentColor:                    '#0B1A33',
  logoUrl:                        '',
  faviconUrl:                     '',
  supportEmail:                   '',
  customDomain:                   '',
  emailFooter:                    '',
  hideIntegritySolveBranding:     false,
  reportWatermark:                '',
};

// ─── GET /api/whitelabel ──────────────────────────────────────────────────────

router.get('/', requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const [ws] = await db
      .select({ settings: workspaces.settings, name: workspaces.name })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId));

    const savedBranding = (ws?.settings as Record<string, unknown>)?.branding ?? {};
    const branding      = { ...DEFAULT_BRANDING, ...savedBranding };

    return ok(res, { branding, workspaceName: ws?.name ?? '' });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/whitelabel ────────────────────────────────────────────────────

router.patch('/', requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId      = getUserId(req);

    const parsed = BrandingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: { code: 'VALIDATION', message: parsed.error.message } });
    }

    const [ws] = await db
      .select({ settings: workspaces.settings })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId));

    const existing  = (ws?.settings as Record<string, unknown>) ?? {};
    const newBranding = { ...(existing.branding as object ?? {}), ...parsed.data };

    await db
      .update(workspaces)
      .set({ settings: { ...existing, branding: newBranding }, updatedAt: new Date() })
      .where(eq(workspaces.id, workspaceId));

    await writeAudit(
      { workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip },
      { action: 'whitelabel.branding_updated', entityType: 'workspace', entityId: workspaceId, reason: 'Branding configuration updated' },
    );

    return ok(res, { branding: newBranding });
  } catch (err) {
    next(err);
  }
});

export default router;
