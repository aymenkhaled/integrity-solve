/**
 * scripts/test-api.mjs — Deep API mutation test suite for Integrity Solve.
 * Uses Node 20 built-in fetch with manual cookie jar.
 * Run: node scripts/test-api.mjs
 */

const BASE  = 'http://localhost:3000/api';
const EMAIL = 'testadmin2@integritysolver.com';
const PASS  = 'TestPass1234!';

// ─── Cookie jar ───────────────────────────────────────────────────────────────
const jar = new Map();
function parseCookies(headers) {
  const raw = headers.getSetCookie?.() ?? [];
  for (const c of raw) {
    const [kv] = c.split(';');
    const eq = kv.indexOf('=');
    if (eq !== -1) jar.set(kv.slice(0, eq).trim(), kv.slice(eq + 1).trim());
  }
}
function cookieHeader() { return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; '); }

// ─── HTTP helper ──────────────────────────────────────────────────────────────
async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(jar.size ? { Cookie: cookieHeader() } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  parseCookies(res.headers);
  let data;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

// ─── Assertions ───────────────────────────────────────────────────────────────
let passCount = 0, failCount = 0;
const failures = [];
function pass(label)         { passCount++; console.log(`  ✓ ${label}`); }
function fail(label, detail) { failCount++; const m = `  ✗ ${label}  ↳  ${JSON.stringify(detail ?? '').slice(0,160)}`; failures.push(m); console.log(m); }
function section(t)          { console.log(`\n${'─'.repeat(62)}\n  ${t}\n${'─'.repeat(62)}`); }
function ok2xx(r)            { return r.status >= 200 && r.status < 300; }
function assert2xx(r, label) { ok2xx(r) ? pass(`${label} (HTTP ${r.status})`) : fail(label, r.data?.error ?? r.data); return ok2xx(r); }
function idOf(r)             { return r.data?.data?.id ?? r.data?.id ?? null; }
function dataOf(r)           { return r.data?.data ?? r.data ?? null; }

// ─── 0. Auth ──────────────────────────────────────────────────────────────────
async function testAuth() {
  section('0. SEED & AUTH');
  assert2xx(await req('POST', '/auth/login', { email: EMAIL, password: PASS }), 'POST /auth/login');
  assert2xx(await req('GET',  '/auth/me'), 'GET /auth/me');

  const seed = await req('POST', '/seed', {});
  ok2xx(seed)
    ? pass(`POST /seed (HTTP ${seed.status}) — demo data seeded`)
    : console.log(`  ⚠  POST /seed → ${seed.status} (${seed.data?.error?.message ?? 'already seeded'})`);

  assert2xx(await req('PATCH', '/auth/profile', { fullName: 'Test Admin API' }), 'PATCH /auth/profile');

  assert2xx(
    await req('POST', '/auth/change-password', { currentPassword: PASS, newPassword: 'TestPass5678!' }),
    'POST /auth/change-password',
  );
  assert2xx(
    await req('POST', '/auth/change-password', { currentPassword: 'TestPass5678!', newPassword: PASS }),
    'POST /auth/change-password (revert)',
  );
}

// ─── 1. Customers ─────────────────────────────────────────────────────────────
let customerId = null;
async function testCustomers() {
  section('1. CUSTOMERS');

  const list = await req('GET', '/customers');
  if (assert2xx(list, 'GET /customers')) {
    Array.isArray(dataOf(list)?.items) ? pass('GET /customers → items array') : fail('GET /customers shape', dataOf(list));
  }

  // CreateCustomerSchema: customerType (enum), givenNames, familyName, email, country
  const create = await req('POST', '/customers', {
    customerType: 'INDIVIDUAL',
    givenNames:   'API',
    familyName:   `TestCustomer${Date.now()}`,
    email:        `apitest${Date.now()}@example.com`,
    country:      'AU',
  });
  if (assert2xx(create, 'POST /customers')) {
    customerId = idOf(create);
    customerId ? pass(`POST /customers → id: ${customerId}`) : fail('POST /customers id', dataOf(create));
  }

  if (!customerId) return;

  assert2xx(await req('GET', `/customers/${customerId}`), 'GET /customers/:id');

  // PATCH requires reason (min 10 chars)
  assert2xx(await req('PATCH', `/customers/${customerId}`, {
    givenNames: 'API Updated',
    reason:     'Updated given name for API test purposes',
  }), 'PATCH /customers/:id');

  // Risk rating: riskRating + reason (no reviewDate in schema)
  assert2xx(await req('PATCH', `/customers/${customerId}/risk-rating`, {
    riskRating: 'HIGH',
    reason:     'Elevated risk detected during API test transaction review',
    riskNotes:  'Multiple red flags identified in test scenario',
  }), 'PATCH /customers/:id/risk-rating');

  // Status change
  assert2xx(await req('PATCH', `/customers/${customerId}/status`, {
    status: 'ACTIVE',
    reason: 'KYC verified via API test suite automated check',
  }), 'PATCH /customers/:id/status');

  // Beneficial owner: givenNames + familyName (not fullName), ownershipPct (not ownershipPercent)
  assert2xx(await req('POST', `/customers/${customerId}/beneficial-owners`, {
    givenNames:   'Jane',
    familyName:   'ApiTestOwner',
    ownershipPct: 35,
    dateOfBirth:  '1975-06-15',
    roleTitle:    'Director',
  }), 'POST /customers/:id/beneficial-owners');
}

// ─── 2. Checks ────────────────────────────────────────────────────────────────
async function testChecks() {
  section('2. CHECKS');
  if (!customerId) { fail('CHECKS skipped', 'no customer ID from step 1'); return; }

  // RunCheckSchema: checkType, provider (MOCK), subjectId (=customerId), subjectType, reason
  const run = await req('POST', '/checks/run', {
    checkType:   'IDENTITY',
    provider:    'MOCK',
    subjectId:   customerId,
    subjectType: 'CUSTOMER',
    reason:      'API test — identity verification for new customer onboarding',
  });
  assert2xx(run, 'POST /checks/run');
  // Checks are async — response has checkRequestId (not id) + status: PENDING
  const checkRequestId = run.data?.data?.checkRequestId ?? run.data?.checkRequestId ?? null;
  checkRequestId ? pass(`POST /checks/run → checkRequestId: ${checkRequestId}`) : fail('POST /checks/run checkRequestId', dataOf(run));

  assert2xx(await req('GET', `/checks?customerId=${customerId}`), 'GET /checks?customerId=');

  // Fetch the actual check ID from the list for the override test
  const checkList = await req('GET', `/checks?customerId=${customerId}`);
  const firstCheck = checkList.data?.data?.items?.[0] ?? checkList.data?.data?.[0] ?? null;
  const checkId = firstCheck?.id ?? null;
  if (checkId) {
    assert2xx(await req('GET', `/checks/${checkId}`), 'GET /checks/:id');
    // ManualOverrideSchema: outcome enum CLEAR|HIT|POTENTIAL_HIT|UNABLE_TO_VERIFY, reason (min 10)
    assert2xx(await req('POST', `/checks/${checkId}/override`, {
      outcome: 'CLEAR',
      reason:  'Manual override — identity confirmed by alternative document review',
    }), 'POST /checks/:id/override');
  } else {
    console.log('  ⚠  Check override skipped — check still PENDING or no check ID available');
  }
}

// ─── 3. Programs ──────────────────────────────────────────────────────────────
async function testPrograms() {
  section('3. PROGRAMS');

  const list = await req('GET', '/programs');
  if (assert2xx(list, 'GET /programs')) {
    Array.isArray(dataOf(list)) ? pass('GET /programs → array') : fail('GET /programs shape', dataOf(list));
  }

  const create = await req('POST', '/programs', { title: 'API Test AML/CTF Program 2026', pathway: 'ACCOUNTING' });
  assert2xx(create, 'POST /programs');
  const programId = idOf(create);
  programId ? pass(`POST /programs → id: ${programId}`) : fail('POST /programs id', dataOf(create));
  if (!programId) return;

  assert2xx(await req('GET', `/programs/${programId}`), 'GET /programs/:id');

  for (const [step, data, desc] of [
    [0, { legalName: 'API Test Pty Ltd', abn: '12345678901', industryPathway: 'ACCOUNTING', businessDescription: 'Test compliance entity for API testing purposes' },   'Business Profile'],
    [1, { designatedServices: ['Cash dealing services', 'Bookkeeping services'], customerSegments: 'SME business clients' },                                              'Designated Services'],
    [2, { inherentRiskRating: 'MEDIUM', residualRiskRating: 'LOW', customerRisk: 'LOW', geographicRisk: 'LOW', riskMitigants: 'Strong CDD controls in place' },        'Risk Assessment'],
    [3, { customerIdProcedure: 'Collect full name, DOB, address and verify against primary government-issued ID documents.' },                                           'Part A'],
    [4, { mlroName: 'Jane Smith', mlroPosition: 'Chief Compliance Officer', mlroEmail: 'compliance@test.com.au' },                                                      'Part B'],
    [5, { standardCddProcedure: 'Collect and verify government ID, screen PEP/sanctions, assess risk rating.' },                                                        'CDD'],
  ]) {
    assert2xx(
      await req('PATCH', `/programs/${programId}/step`, { step, data, reason: `API test — ${desc} step completed` }),
      `PATCH /programs/:id/step (step ${step} — ${desc})`,
    );
  }
}

// ─── 4. Escalations ───────────────────────────────────────────────────────────
async function testEscalations() {
  section('4. ESCALATIONS');

  assert2xx(await req('GET', '/escalations'), 'GET /escalations');

  // CreateEscalationSchema: subject (min 5), summary (min 20), grounds (min 20), riskRating, reason (min 10)
  const create = await req('POST', '/escalations', {
    customerId:  customerId ?? undefined,
    subject:     'Suspected structuring — API Test Escalation',
    summary:     'Multiple cash deposits just below the $10,000 CTR threshold were identified across 3 consecutive business days, consistent with structuring.',
    grounds:     'Transaction pattern analysis identified 5 deposits of $9,500 each over 3 days by the same customer, totalling $47,500. This pattern is consistent with structuring to avoid AUSTRAC TTR obligations.',
    riskRating:  'HIGH',
    reason:      'Escalating due to identified structuring pattern in API test',
  });
  assert2xx(create, 'POST /escalations');
  const escId = idOf(create);
  escId ? pass(`POST /escalations → id: ${escId}`) : fail('POST /escalations id', dataOf(create));
  if (!escId) return;

  assert2xx(await req('GET', `/escalations/${escId}`), 'GET /escalations/:id');

  // UpdateEscalationSchema: subject?, summary?, grounds?, assignedTo?, reason (min 10)
  assert2xx(await req('PATCH', `/escalations/${escId}`, {
    subject: 'Suspected structuring — API Test Escalation (Updated)',
    reason:  'Updated subject line to include escalation ID reference for tracking',
  }), 'PATCH /escalations/:id');

  assert2xx(await req('POST', `/escalations/${escId}/escalate`, {
    reason: 'Escalating to senior compliance officer for secondary review',
  }), 'POST /escalations/:id/escalate');

  // CreateSmrDraftSchema: escalationId, reportingEntity (min 2), narrativeText (min 50 optional),
  //   suspiciousActs (array, default []), subjectDetails (record, default {}), reason (min 10)
  const smr = await req('POST', `/escalations/${escId}/smr`, {
    escalationId:    escId,
    reportingEntity: 'API Test Pty Ltd',
    narrativeText:   'The reporting entity has identified a pattern of structured cash transactions designed to avoid the $10,000 threshold transaction reporting obligation under the AML/CTF Act 2006. The subject conducted five separate cash deposits of $9,500 each over three consecutive business days.',
    suspiciousActs:  [],
    subjectDetails:  { customerRef: customerId ?? 'UNKNOWN' },
    reason:          'Creating SMR draft for structuring pattern identified in API test',
  });
  assert2xx(smr, 'POST /escalations/:id/smr (create SMR draft)');
  const smrId = idOf(smr);
  smrId ? pass(`POST SMR draft → id: ${smrId}`) : fail('SMR id extraction', dataOf(smr));

  if (smrId) {
    assert2xx(await req('POST', `/escalations/${escId}/smr/${smrId}/approve`, {
      reason: 'SMR reviewed and approved by senior compliance officer in API test',
    }), 'POST /escalations/:id/smr/:smrId/approve');

    assert2xx(await req('POST', `/escalations/${escId}/smr/${smrId}/submit`, {
      reason: 'SMR submitted to AUSTRAC via API test suite validation',
    }), 'POST /escalations/:id/smr/:smrId/submit');
  }
}

// ─── 5. Tasks ─────────────────────────────────────────────────────────────────
async function testTasks() {
  section('5. TASKS');

  const list = await req('GET', '/tasks');
  if (assert2xx(list, 'GET /tasks')) {
    const d = dataOf(list);
    (Array.isArray(d) || Array.isArray(d?.items)) ? pass('GET /tasks → data') : fail('GET /tasks shape', d);
  }

  // CreateTaskSchema: title (min 3), description?, priority (LOW|MEDIUM|HIGH|URGENT), dueAt?
  const due = new Date(Date.now() + 14 * 86400000).toISOString();
  const create = await req('POST', '/tasks', {
    title:    'API Test Compliance Task',
    description: 'Periodic CDD review task created by API test suite',
    priority: 'HIGH',
    dueAt:    due,
  });
  assert2xx(create, 'POST /tasks');
  const taskId = idOf(create);
  taskId ? pass(`POST /tasks → id: ${taskId}`) : fail('POST /tasks id', dataOf(create));

  if (taskId) {
    // UpdateTaskSchema: all CreateTask fields optional + status (OPEN|IN_PROGRESS|COMPLETE|CANCELLED|BLOCKED)
    assert2xx(await req('PATCH', `/tasks/${taskId}`, {
      status:   'IN_PROGRESS',
      priority: 'URGENT',  // URGENT not CRITICAL
    }), 'PATCH /tasks/:id');
  }
}

// ─── 6. Alerts ────────────────────────────────────────────────────────────────
async function testAlerts() {
  section('6. ALERTS');

  const list = await req('GET', '/alerts');
  if (assert2xx(list, 'GET /alerts')) {
    const d = dataOf(list);
    (Array.isArray(d) || Array.isArray(d?.items)) ? pass('GET /alerts → data') : fail('GET /alerts shape', d);
  }

  // CreateAlertSchema: severity (INFO|WARNING|HIGH|CRITICAL), alertType (string), title, description
  const create = await req('POST', '/alerts', {
    severity:    'HIGH',
    alertType:   'TRANSACTION_MONITORING',
    title:       'API Test — High Value Cash Transaction Alert',
    description: 'Cash transaction of $45,000 detected exceeding monitoring threshold for this customer profile.',
    ...(customerId ? { customerId } : {}),
  });
  assert2xx(create, 'POST /alerts');
  const alertId = idOf(create);
  alertId ? pass(`POST /alerts → id: ${alertId}`) : fail('POST /alerts id', dataOf(create));

  if (alertId) {
    assert2xx(await req('POST', `/alerts/${alertId}/acknowledge`, {}), 'POST /alerts/:id/acknowledge');

    // ResolveAlertSchema: resolutionNote (min 10) — NOT resolution
    assert2xx(await req('POST', `/alerts/${alertId}/resolve`, {
      resolutionNote: 'Investigated transaction — legitimate business activity confirmed, customer provided supporting documentation',
    }), 'POST /alerts/:id/resolve');
  }
}

// ─── 7. Training ──────────────────────────────────────────────────────────────
async function testTraining() {
  section('7. TRAINING');

  const list = await req('GET', '/training');
  if (assert2xx(list, 'GET /training')) {
    const d = dataOf(list);
    (d?.records || Array.isArray(d)) ? pass('GET /training → data') : fail('GET /training shape', d);
  }

  // CreateTrainingSchema: moduleName OR courseTitle required
  const create = await req('POST', '/training', {
    moduleName:    'API Test AML/CTF Training Module',
    moduleVersion: '2.0',
    trainingType:  'ONLINE',
    scheduledAt:   new Date().toISOString(),
    notes:         'API test training record',
  });
  assert2xx(create, 'POST /training');
  const trainingId = idOf(create);
  trainingId ? pass(`POST /training → id: ${trainingId}`) : fail('POST /training id', dataOf(create));

  if (trainingId) {
    assert2xx(await req('PATCH', `/training/${trainingId}`, {
      moduleVersion: '2.1',
      notes:         'Updated version number in API test patch',
    }), 'PATCH /training/:id');
  }
}

// ─── 8. Reviews ───────────────────────────────────────────────────────────────
async function testReviews() {
  section('8. REVIEWS');

  const list = await req('GET', '/reviews');
  if (assert2xx(list, 'GET /reviews')) {
    const d = dataOf(list);
    (d?.reviews || Array.isArray(d)) ? pass('GET /reviews → data') : fail('GET /reviews shape', d);
  }

  if (!customerId) { fail('POST /reviews skipped', 'customerId required but unavailable'); return; }

  const dueAt = new Date(Date.now() + 30 * 86400000).toISOString();

  // CreateReviewSchema: customerId (required!), dueAt (required!), scheduledAt?, reviewType?, notes?
  const create = await req('POST', '/reviews', {
    customerId,
    dueAt,
    reviewType: 'PERIODIC',
    notes:      'Annual CDD review created by API test suite',
  });
  assert2xx(create, 'POST /reviews');
  const reviewId = idOf(create);
  reviewId ? pass(`POST /reviews → id: ${reviewId}`) : fail('POST /reviews id', dataOf(create));

  if (reviewId) {
    assert2xx(await req('POST', `/reviews/${reviewId}/start`, {}), 'POST /reviews/:id/start');

    // CompleteReviewSchema: newRating (LOW|MEDIUM|HIGH|CRITICAL|UNRATED), findings (array), notes (min 10), reason (min 10)
    assert2xx(await req('POST', `/reviews/${reviewId}/complete`, {
      newRating: 'MEDIUM',
      findings:  ['CDD documentation up to date', 'Risk rating confirmed as MEDIUM'],
      notes:     'Periodic review completed. Customer documentation verified. No material changes to risk profile.',
      reason:    'Completing review cycle as per scheduled annual review plan in API test',
    }), 'POST /reviews/:id/complete');
  }
}

// ─── 9. Notifications ─────────────────────────────────────────────────────────
async function testNotifications() {
  section('9. NOTIFICATIONS');

  const list = await req('GET', '/notifications');
  if (assert2xx(list, 'GET /notifications')) {
    const d = dataOf(list);
    (Array.isArray(d) || Array.isArray(d?.items)) ? pass('GET /notifications → data') : fail('GET /notifications shape', d);
  }

  assert2xx(await req('POST', '/notifications/read-all', {}), 'POST /notifications/read-all');
}

// ─── 10. Workspace ────────────────────────────────────────────────────────────
async function testWorkspace() {
  section('10. WORKSPACE');
  assert2xx(await req('GET',   '/workspaces/current'), 'GET /workspaces/current');
  assert2xx(await req('PATCH', '/workspaces/current', { legalName: 'API Test Workspace Pty Ltd' }), 'PATCH /workspaces/current');
  assert2xx(await req('GET',   '/workspaces/members'), 'GET /workspaces/members');
}

// ─── 11. Audit ────────────────────────────────────────────────────────────────
async function testAudit() {
  section('11. AUDIT LOG');
  const list = await req('GET', '/audit');
  if (assert2xx(list, 'GET /audit')) {
    dataOf(list)?.items ? pass('GET /audit → items') : fail('GET /audit shape', dataOf(list));
  }
  assert2xx(await req('GET', '/audit?limit=10'), 'GET /audit?limit=10');
}

// ─── 12. Analytics ────────────────────────────────────────────────────────────
async function testAnalytics() {
  section('12. ANALYTICS');
  for (const ep of ['/analytics/smr', '/analytics/training', '/analytics/reviews']) {
    assert2xx(await req('GET', ep), `GET ${ep}`);
  }
  const dash = await req('GET', '/analytics/dashboard');
  ok2xx(dash)
    ? pass(`GET /analytics/dashboard (HTTP ${dash.status})`)
    : console.log(`  ⚠  GET /analytics/dashboard → ${dash.status} (endpoint not present — skip)`);
}

// ─── 13. Documents ────────────────────────────────────────────────────────────
async function testDocuments() {
  section('13. DOCUMENTS');
  assert2xx(await req('GET', '/documents'), 'GET /documents');
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║      INTEGRITY SOLVE — DEEP API MUTATION TEST SUITE       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`  Target: ${BASE}\n  User:   ${EMAIL}`);
  try {
    await testAuth();
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
    await testDocuments();
  } catch (err) {
    console.error('\n  FATAL:', err.message, err.stack);
  }
  const total = passCount + failCount;
  console.log(`\n╔════════════════════════════════════════════════════════════╗`);
  console.log(`║  RESULTS: ${passCount}/${total} passed, ${failCount} failed${' '.repeat(Math.max(0, 30 - `${passCount}/${total}`.length - `${failCount}`.length))}║`);
  console.log(`╚════════════════════════════════════════════════════════════╝`);
  if (failures.length) { console.log('\n  Failures:'); failures.forEach(f => console.log(f)); }
  process.exit(failCount > 0 ? 1 : 0);
}
main();
