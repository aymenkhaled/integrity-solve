/**
 * server/routes/auth.ts — Authentication endpoints.
 */
import { Router } from 'express';
import bcrypt from 'bcrypt';
import { createId } from '@paralleldrive/cuid2';
import { db } from '../db.js';
import {
  users, workspaces, workspaceMemberships,
  verificationCodes, sessions,
} from '../../shared/schema.js';
import { eq, and, gt, lt } from 'drizzle-orm';
import {
  RegisterSchema, LoginSchema, VerifyEmailSchema,
} from '../../shared/validators.js';
import { validateBody, ok } from '../lib/validate.js';
import { createSession, destroySession, requireAuth } from '../lib/auth-session.js';
import { AppError, ConflictError, ValidationError } from '../lib/errors.js';
import { writeAudit } from '../lib/audit.js';
import logger from '../lib/logger.js';
import { addMinutes } from 'date-fns';

const router = Router();

const BCRYPT_ROUNDS = 12;

// Helper: generate 6-digit OTP
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── POST /api/auth/register ────────────────────────────────────────────────

router.post('/register', validateBody(RegisterSchema), async (req, res, next) => {
  try {
    const { email, password, fullName, legalName, abn, pathway } = req.body as {
      email: string; password: string; fullName: string;
      legalName: string; abn?: string; pathway?: string;
    };

    const normalizedEmail = email.toLowerCase().trim();

    // Check existing user
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existing) throw new ConflictError('An account with this email already exists');

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create workspace + user in a transaction
    const result = await db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({
        email:        normalizedEmail,
        passwordHash,
        fullName,
        isActive:     true,
        isPlatformAdmin: false,
        identityStatus: 'PENDING',
      }).returning();

      if (!user) throw new AppError('INTERNAL_ERROR', 'Failed to create user', 500);

      const [workspace] = await tx.insert(workspaces).values({
        legalName,
        abn,
        industryPathway: pathway as typeof workspaces.$inferInsert['industryPathway'] ?? null,
        billingStatus:   'INACTIVE',
        subscriptionTier: 'TRIAL',
        trialEndsAt:     new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      }).returning();

      if (!workspace) throw new AppError('INTERNAL_ERROR', 'Failed to create workspace', 500);

      await tx.insert(workspaceMemberships).values({
        userId:      user.id,
        workspaceId: workspace.id,
        role:        'WORKSPACE_ADMIN',
        status:      'ACTIVE',
        joinedAt:    new Date(),
      });

      // Create email verification code
      const otp = generateOtp();
      const codeHash = await bcrypt.hash(otp, 6);

      await tx.insert(verificationCodes).values({
        userId:      user.id,
        channel:     'EMAIL',
        destination: normalizedEmail,
        codeHash,
        expiresAt:   addMinutes(new Date(), 30),
      });

      logger.info({ userId: user.id, email: normalizedEmail }, 'New user registered');

      // In dev: log the OTP to console since email is disabled
      if (process.env.NODE_ENV !== 'production') {
        logger.info({ otp, email: normalizedEmail }, '📧 Email verification OTP (dev only)');
      }

      return { user, workspace, otp };
    });

    // Create session
    await createSession(res, result.user.id, result.workspace.id, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    ok(res, {
      user: {
        id:        result.user.id,
        email:     result.user.email,
        fullName:  result.user.fullName,
        emailVerifiedAt: null,
      },
      workspace: {
        id:        result.workspace.id,
        legalName: result.workspace.legalName,
        role:      'WORKSPACE_ADMIN',
        trialEndsAt: result.workspace.trialEndsAt?.toISOString(),
      },
      // In dev: return OTP directly for easy testing
      ...(process.env.NODE_ENV !== 'production' ? { _devOtp: result.otp } : {}),
    }, 201);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/login ────────────────────────────────────────────────────

router.post('/login', validateBody(LoginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const normalizedEmail = email.toLowerCase().trim();

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, normalizedEmail), eq(users.isActive, true)))
      .limit(1);

    if (!user || !user.passwordHash) {
      throw new ValidationError('Invalid email or password');
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      throw new ValidationError('Invalid email or password');
    }

    // Get workspaces for this user
    const memberships = await db
      .select({
        workspaceId: workspaceMemberships.workspaceId,
        role:        workspaceMemberships.role,
        status:      workspaceMemberships.status,
      })
      .from(workspaceMemberships)
      .where(
        and(
          eq(workspaceMemberships.userId, user.id),
          eq(workspaceMemberships.status, 'ACTIVE'),
        ),
      );

    // Use first active workspace (user can switch later)
    const firstMembership = memberships[0];

    await createSession(res, user.id, firstMembership?.workspaceId ?? null, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Update lastLoginAt
    void db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    logger.info({ userId: user.id }, 'User logged in');

    ok(res, {
      user: {
        id:              user.id,
        email:           user.email,
        fullName:        user.fullName,
        emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
        isPlatformAdmin: user.isPlatformAdmin,
        identityStatus:  user.identityStatus,
      },
      workspaces: memberships.map((m) => ({
        workspaceId: m.workspaceId,
        role:        m.role,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/logout ───────────────────────────────────────────────────

router.post('/logout', async (req, res, next) => {
  try {
    await destroySession(req, res);
    ok(res, { message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/auth/me ────────────────────────────────────────────────────────

router.get('/me', requireAuth, (req, res) => {
  ok(res, req.session);
});

// ─── POST /api/auth/verify-email ─────────────────────────────────────────────

router.post('/verify-email', requireAuth, validateBody(VerifyEmailSchema), async (req, res, next) => {
  try {
    const { code } = req.body as { code: string };
    const userId = req.session!.user.id;
    const userEmail = req.session!.user.email;

    const now = new Date();
    const pendingCodes = await db
      .select()
      .from(verificationCodes)
      .where(
        and(
          eq(verificationCodes.userId, userId),
          eq(verificationCodes.channel, 'EMAIL'),
          eq(verificationCodes.destination, userEmail),
          gt(verificationCodes.expiresAt, now),
        ),
      );

    let matched: (typeof pendingCodes)[0] | null = null;

    for (const vc of pendingCodes) {
      if (!vc.consumedAt && vc.attempts < 5) {
        const isMatch = await bcrypt.compare(code, vc.codeHash);
        if (isMatch) {
          matched = vc;
          break;
        }
        // Increment attempts
        await db
          .update(verificationCodes)
          .set({ attempts: vc.attempts + 1 })
          .where(eq(verificationCodes.id, vc.id));
      }
    }

    if (!matched) {
      throw new ValidationError('Invalid or expired verification code', 'code');
    }

    await db.transaction(async (tx) => {
      await tx
        .update(verificationCodes)
        .set({ consumedAt: now })
        .where(eq(verificationCodes.id, matched!.id));

      await tx
        .update(users)
        .set({ emailVerifiedAt: now })
        .where(eq(users.id, userId));
    });

    logger.info({ userId }, 'Email verified');
    ok(res, { emailVerifiedAt: now.toISOString() });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/resend-verification ──────────────────────────────────────

router.post('/resend-verification', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session!.user.id;
    const userEmail = req.session!.user.email;

    if (req.session!.user.emailVerifiedAt) {
      throw new ValidationError('Email already verified');
    }

    const otp = generateOtp();
    const codeHash = await bcrypt.hash(otp, 6);

    await db.insert(verificationCodes).values({
      userId,
      channel:     'EMAIL',
      destination: userEmail,
      codeHash,
      expiresAt:   addMinutes(new Date(), 30),
    });

    if (process.env.NODE_ENV !== 'production') {
      logger.info({ otp, email: userEmail }, '📧 Resent email verification OTP (dev only)');
    }

    ok(res, {
      message: 'Verification code sent',
      ...(process.env.NODE_ENV !== 'production' ? { _devOtp: otp } : {}),
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/switch-workspace ─────────────────────────────────────────

router.post('/switch-workspace', requireAuth, async (req, res, next) => {
  try {
    const { workspaceId } = req.body as { workspaceId: string };
    const userId = req.session!.user.id;

    const [membership] = await db
      .select()
      .from(workspaceMemberships)
      .where(
        and(
          eq(workspaceMemberships.userId, userId),
          eq(workspaceMemberships.workspaceId, workspaceId),
          eq(workspaceMemberships.status, 'ACTIVE'),
        ),
      )
      .limit(1);

    if (!membership) {
      throw new AppError('FORBIDDEN', 'Not a member of this workspace', 403);
    }

    // Update the existing session
    const sessionId = req.session!.sessionId;
    await db.update(sessions).set({ workspaceId }).where(eq(sessions.id, sessionId));

    ok(res, { workspaceId, role: membership.role });
  } catch (err) {
    next(err);
  }
});

export default router;
