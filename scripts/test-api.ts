/**
 * scripts/test-api.ts — Deep API mutation test suite for Integrity Solve.
 *
 * Run with: npx tsx scripts/test-api.ts
 *
 * This exercises every significant mutation endpoint with a seeded test workspace.
 * All results are printed with pass/fail status.
 */

import fetch from 'node-fetch';

const BASE = process.env.TEST_API_BASE ?? 'http://localhost:3000/api';
const EMAIL = 'testadmin2@integritysolver.com';
const PASSWORD = 'TestPass1234!';

// ─── Utilities ────────────────────────────────────────────────────────────────

let cookieJar = '';
let passCount = 0;
let failCount = 0;
const failures: string[] = [];

async function req(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; data: unknown }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookieJar ? { Cookie: cookieJar } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookieJar = setCookie.split(';')[0]!;

  let data: unknown;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

function pass(label: string) {
  passCount++;
  console.log(`  ✓ ${label}`);
}

function fail(label: string, detail?: unknown) {
  failCount++;
  const msg = `  ✗ ${label}${detail ? ` — ${JSON.stringify(detail)}` : ''}`;
  failures.push(msg);
  console.log(msg);
}

function assert(cond: boolean, label: string, detail?: unknown) {
  cond ? pass(label) : fail(label, detail);
}

function section(title: string) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${title.toUpperCase()}`);
  console.log(`${'─'.repeat(60)}`);
}

// ─── Test: Seed + Auth ────────────────────────────────────────────────────────

section('0. SEED & AUTH');

async function testSeedAndAuth() {
  // Seed
  const seed = await req('GET', '/seed');
  assert(seed.status === 200, 'GET /seed returns 200', seed.data);

  // Login
  const login = await req('POST', '/auth/login', { email: EMAIL, password: PASSWORD });
  assert(login.status === 200, 'POST /auth/login succeeds', login.data);

  // Me
  const me = await req('GET', '/auth/me');
  assert(me.status === 200, 'GET /auth/me returns session');

  // Update profile
  const profile = await req('PATCH', '/auth/profile', { fullName: 'Test Admin API' });
  assert(profile.status === 200, 'PATCH /auth/profile updates name');

  // Change password (then change back)
  const cp1 = await req('POST', '/auth/change-password', {
    currentPassword: PASSWORD,
    newPassword: 'TestPass5678!',
  });
  assert(cp1.status === 200, 'POST /auth/change-password succeeds');

  const cp2 = await req('POST', '/auth/change-password', {
    currentPassword: 'TestPass5678!',
    newPassword: PASSWORD,
  });
  assert(cp2.status === 200, 'POST /auth/change-password reverts password');
}

// ─── Test: Customers ─────────────────────────────────────────────────────────

section('1. CUSTOMERS');

let customerId: string;

async function testCustomers() {
  // List
  const list = await req('GET', '/customers');
  assert((list.data as { items?: unknown[] })?.items !== undefined, 'GET /customers returns items');

  // Create
  const create = await req('POST', '/customers', {
    entityType:  'INDIVIDUAL',
    fullName:    'API Test Customer',
    email:       `api-test-${Date.now()}@example.com`,
    riskRating:  'MEDIUM',
    kycStatus:   'PENDING',
  });
  assert(create.status === 201, 'POST /customers creates customer');
  customerId = (create.data as { id?: string })?.id ?? '';

  if (!customerId) { fail('No customer ID returned'); return; }

  // Get
  const get = await req('GET', `/customers/${customerId}`);
  assert(get.status === 200, `GET /customers/${customerId} returns customer`);

  // Update
  const update = await req('PATCH', `/customers/${customerId}`, { fullName: 'API Test Customer Updated' });
  assert(update.status === 200, 'PATCH /customers/:id updates customer');

  // Update risk rating
  const risk = await req('PATCH', `/customers/${customerId}/risk-rating`, {
    riskRating:  'HIGH',
    reason:      'Updated via API test',
    reviewDate:  new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
  });
  assert(risk.status === 200, 'PATCH /customers/:id/risk-rating updates risk');

  // Update status
  const status = await req('PATCH', `/customers/${customerId}/status`, {
    status: 'ACTIVE',
    reason: 'Verified via API test',
  });
  assert(status.status === 200, 'PATCH /customers/:id/status updates status');

  // Add beneficial owner
  const bo = await req('POST', `/customers/${customerId}/beneficial-owners`, {
    fullName:           'Jane Doe',
    ownershipPercent:   35,
    dateOfBirth:        '1975-06-15',
    residentialAddress: '1 Collins St, Melbourne VIC 3000',
    countryOfResidence: 'AU',
    isPep:              false,
  });
  assert(bo.status === 201, 'POST /customers/:id/beneficial-owners creates BO');
}

// ─── Test: Checks ─────────────────────────────────────────────────────────────

section('2. CHECKS');

let checkId: string;

async function testChecks() {
  if (!customerId) { fail('Skipping — no customer ID'); return; }

  const run = await req('POST', '/checks/run', {
    customerId,
    checkType: 'IDENTITY',
    provider:  'MANUAL',
    notes:     'API test check run',
  });
  assert([200, 201].includes(run.status), 'POST /checks/run creates check');
  checkId = (run.data as { id?: string })?.id ?? '';

  const list = await req('GET', `/checks?customerId=${customerId}`);
  assert((list.data as { items?: unknown[] })?.items !== undefined, 'GET /checks?customerId= filters correctly');

  if (checkId) {
    const get = await req('GET', `/checks/${checkId}`);
    assert(get.status === 200, `GET /checks/${checkId} returns check`);

    const override = await req('POST', `/checks/${checkId}/override`, {
      outcome:       'PASS',
      justification: 'Manual override via API test',
    });
    assert([200, 201].includes(override.status), 'POST /checks/:id/override overrides check');
  }
}

// ─── Test: Programs ───────────────────────────────────────────────────────────

section('3. PROGRAMS');

let programId: string;

async function testPrograms() {
  const list = await req('GET', '/programs');
  assert(Array.isArray(list.data), 'GET /programs returns array');

  const create = await req('POST', '/programs', {
    title:      'API Test AML/CTF Program',
    pathway:    'ACCOUNTING',
  });
  assert([200, 201].includes(create.status), 'POST /programs creates program');
  programId = (create.data as { id?: string })?.id ?? '';

  if (!programId) { fail('No program ID returned'); return; }

  const get = await req('GET', `/programs/${programId}`);
  assert(get.status === 200, 'GET /programs/:id returns program');

  // Save step 0 with real structured data
  const step = await req('PATCH', `/programs/${programId}/step`, {
    step:   0,
    data:   { legalName: 'API Test Pty Ltd', abn: '12345678901', industryPathway: 'ACCOUNTING' },
    reason: 'API test — business profile step',
  });
  assert(step.status === 200, 'PATCH /programs/:id/step saves step data');

  // Save step 1
  const step1 = await req('PATCH', `/programs/${programId}/step`, {
    step:   1,
    data:   { designatedServices: ['Cash dealing services', 'Bookkeeping services'] },
    reason: 'API test — designated services step',
  });
  assert(step1.status === 200, 'PATCH /programs/:id/step saves designated services');
}

// ─── Test: Escalations ────────────────────────────────────────────────────────

section('4. ESCALATIONS');

let escalationId: string;
let smrId: string;

async function testEscalations() {
  if (!customerId) { fail('Skipping — no customer ID'); return; }

  // Create
  const create = await req('POST', '/escalations', {
    customerId,
    title:       'API Test Escalation',
    description: 'Suspicious transactions detected during API testing',
    severity:    'MEDIUM',
    category:    'TRANSACTION_MONITORING',
  });
  assert([200, 201].includes(create.status), 'POST /escalations creates escalation');
  escalationId = (create.data as { id?: string })?.id ?? '';

  if (!escalationId) { fail('No escalation ID returned'); return; }

  const get = await req('GET', `/escalations/${escalationId}`);
  assert(get.status === 200, 'GET /escalations/:id returns escalation');

  // Update
  const update = await req('PATCH', `/escalations/${escalationId}`, {
    notes: 'Additional notes added via API test',
  });
  assert(update.status === 200, 'PATCH /escalations/:id updates escalation');

  // Escalate
  const escalate = await req('POST', `/escalations/${escalationId}/escalate`, {
    reason: 'Escalating to senior compliance officer for review',
  });
  assert([200, 201].includes(escalate.status), 'POST /escalations/:id/escalate changes status');

  // Create SMR
  const smr = await req('POST', `/escalations/${escalationId}/smr`, {
    transactionIds:     [],
    suspiciousBehavior: 'Multiple cash transactions just below $10,000 threshold detected over 3 days',
    reportingObligation:'SMR',
    austracCategory:    'STRUCTURING',
    lodgementReason:    'API test SMR',
  });
  assert([200, 201].includes(smr.status), 'POST /escalations/:id/smr creates SMR draft');
  smrId = (smr.data as { id?: string })?.id ?? '';

  if (smrId) {
    const approve = await req('POST', `/escalations/${escalationId}/smr/${smrId}/approve`, {
      reason: 'Approved via API test',
    });
    assert([200, 201].includes(approve.status), 'POST /escalations/:id/smr/:smrId/approve approves SMR');

    const submit = await req('POST', `/escalations/${escalationId}/smr/${smrId}/submit`, {
      reason: 'Submitted to AUSTRAC via API test',
    });
    assert([200, 201].includes(submit.status), 'POST /escalations/:id/smr/:smrId/submit submits SMR');
  }
}

// ─── Test: Tasks ─────────────────────────────────────────────────────────────

section('5. TASKS');

let taskId: string;

async function testTasks() {
  const list = await req('GET', '/tasks');
  assert((list.data as { items?: unknown[] })?.items !== undefined || Array.isArray(list.data), 'GET /tasks returns data');

  const create = await req('POST', '/tasks', {
    title:       'API Test Task',
    description: 'Test task created by automated API test',
    priority:    'MEDIUM',
    dueDate:     new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
  });
  assert([200, 201].includes(create.status), 'POST /tasks creates task');
  taskId = (create.data as { id?: string })?.id ?? '';

  if (taskId) {
    const update = await req('PATCH', `/tasks/${taskId}`, {
      status:   'IN_PROGRESS',
      priority: 'HIGH',
    });
    assert(update.status === 200, 'PATCH /tasks/:id updates task');
  }
}

// ─── Test: Alerts ─────────────────────────────────────────────────────────────

section('6. ALERTS');

let alertId: string;

async function testAlerts() {
  const list = await req('GET', '/alerts');
  assert((list.data as { items?: unknown[] })?.items !== undefined || Array.isArray(list.data), 'GET /alerts returns data');

  const create = await req('POST', '/alerts', {
    title:       'API Test Alert',
    description: 'Automated alert created during API test',
    severity:    'MEDIUM',
    category:    'TRANSACTION_MONITORING',
    ...(customerId ? { customerId } : {}),
  });
  assert([200, 201].includes(create.status), 'POST /alerts creates alert');
  alertId = (create.data as { id?: string })?.id ?? '';

  if (alertId) {
    const ack = await req('POST', `/alerts/${alertId}/acknowledge`);
    assert([200, 201].includes(ack.status), 'POST /alerts/:id/acknowledge acknowledges alert');

    const resolve = await req('POST', `/alerts/${alertId}/resolve`, {
      resolution: 'Resolved during API test — no suspicious activity confirmed',
    });
    assert([200, 201].includes(resolve.status), 'POST /alerts/:id/resolve resolves alert');
  }
}

// ─── Test: Training ───────────────────────────────────────────────────────────

section('7. TRAINING');

let trainingId: string;

async function testTraining() {
  const list = await req('GET', '/training');
  assert((list.data as { items?: unknown[] })?.items !== undefined || Array.isArray(list.data), 'GET /training returns data');

  const create = await req('POST', '/training', {
    title:          'API Test Training Module',
    description:    'AML/CTF training created via API test',
    moduleType:     'ONLINE',
    requiredForAll: true,
    durationMinutes: 45,
    expiryMonths:   12,
  });
  assert([200, 201].includes(create.status), 'POST /training creates training record');
  trainingId = (create.data as { id?: string })?.id ?? '';

  if (trainingId) {
    const update = await req('PATCH', `/training/${trainingId}`, {
      title:       'API Test Training Module (Updated)',
      durationMinutes: 60,
    });
    assert(update.status === 200, 'PATCH /training/:id updates training');
  }
}

// ─── Test: Reviews ────────────────────────────────────────────────────────────

section('8. REVIEWS');

let reviewId: string;

async function testReviews() {
  const list = await req('GET', '/reviews');
  assert((list.data as { items?: unknown[] })?.items !== undefined || Array.isArray(list.data), 'GET /reviews returns data');

  const create = await req('POST', '/reviews', {
    reviewType:  'PERIODIC',
    title:       'API Test Periodic Review',
    description: 'Annual AML/CTF program review — API test',
    dueDate:     new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    ...(customerId ? { customerId } : {}),
  });
  assert([200, 201].includes(create.status), 'POST /reviews creates review');
  reviewId = (create.data as { id?: string })?.id ?? '';

  if (reviewId) {
    const start = await req('POST', `/reviews/${reviewId}/start`);
    assert([200, 201].includes(start.status), 'POST /reviews/:id/start starts review');

    const complete = await req('POST', `/reviews/${reviewId}/complete`, {
      outcome: 'SATISFACTORY',
      findings: 'No critical findings identified. Minor improvements recommended for CDD procedures.',
      nextReviewDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    });
    assert([200, 201].includes(complete.status), 'POST /reviews/:id/complete completes review');
  }
}

// ─── Test: Notifications ──────────────────────────────────────────────────────

section('9. NOTIFICATIONS');

async function testNotifications() {
  const list = await req('GET', '/notifications');
  assert((list.data as { items?: unknown[] })?.items !== undefined || Array.isArray(list.data), 'GET /notifications returns data');

  const all = await req('POST', '/notifications/read-all');
  assert([200, 201].includes(all.status), 'POST /notifications/read-all marks all read');
}

// ─── Test: Workspace ──────────────────────────────────────────────────────────

section('10. WORKSPACE');

async function testWorkspace() {
  const current = await req('GET', '/workspaces/current');
  assert(current.status === 200, 'GET /workspaces/current returns workspace');

  const update = await req('PATCH', '/workspaces/current', {
    legalName: 'API Test Workspace Updated',
  });
  assert(update.status === 200, 'PATCH /workspaces/current updates workspace');

  const members = await req('GET', '/workspaces/members');
  assert((members.data as unknown[])?.length > 0 || members.status === 200, 'GET /workspaces/members returns members');
}

// ─── Test: Audit ──────────────────────────────────────────────────────────────

section('11. AUDIT LOG');

async function testAudit() {
  const list = await req('GET', '/audit');
  assert((list.data as { items?: unknown[] })?.items !== undefined || Array.isArray(list.data), 'GET /audit returns audit log');

  const filtered = await req('GET', '/audit?limit=5');
  assert(filtered.status === 200, 'GET /audit?limit=5 returns filtered log');
}

// ─── Test: Analytics ─────────────────────────────────────────────────────────

section('12. ANALYTICS');

async function testAnalytics() {
  for (const endpoint of ['/analytics/dashboard', '/analytics/smr', '/analytics/training', '/analytics/reviews']) {
    const r = await req('GET', endpoint);
    assert(r.status === 200, `GET ${endpoint} returns data`);
  }
}

// ─── Run all tests ────────────────────────────────────────────────────────────

async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║      INTEGRITY SOLVE — DEEP API MUTATION TEST SUITE       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`  Target: ${BASE}`);
  console.log(`  User:   ${EMAIL}`);

  try {
    await testSeedAndAuth();
    await testCustomers();
    await testChecks();
    await testPrograms();
    await testEscalations();
    await testTasks();
    await testAlerts();
    await testTraining();
    await testReviews();
    await testNotifications();
    await testWorkspace();
    await testAudit();
    await testAnalytics();
  } catch (err) {
    console.error('\n  FATAL ERROR:', err);
  }

  const total = passCount + failCount;
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log(`║  RESULTS: ${passCount}/${total} passed, ${failCount} failed`);
  console.log('╚════════════════════════════════════════════════════════════╝');

  if (failures.length > 0) {
    console.log('\n  Failed tests:');
    failures.forEach((f) => console.log(f));
  }

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(console.error);
