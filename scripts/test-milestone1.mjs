/**
 * scripts/test-milestone1.mjs — Milestone 1 end-to-end API test suite.
 * Tests: Cases · Program wizard · Transaction/CDD wizard · Didit mock sessions
 * Run: node scripts/test-milestone1.mjs
 */

const BASE  = 'http://localhost:3000/api';
const EMAIL = 'testadmin2@integritysolver.com';
const PASS  = 'TestPass1234!';

// ─── Cookie jar ──────────────────────────────────────────────────────────────
const jar = new Map();
function parseCookies(headers) {
  const raw = headers.getSetCookie?.() ?? [];
  for (const c of raw) {
    const [kv] = c.split(';');
    const eq   = kv.indexOf('=');
    if (eq !== -1) jar.set(kv.slice(0, eq).trim(), kv.slice(eq + 1).trim());
  }
}
function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────
async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(jar.size ? { Cookie: cookieHeader() } : {}),
    },
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
function fail(label, detail) { failCount++; const m = `  ✗ ${label}  ↳  ${JSON.stringify(detail ?? '').slice(0,200)}`; failures.push(m); console.log(m); }
function section(t)          { console.log(`\n${'─'.repeat(64)}\n  ${t}\n${'─'.repeat(64)}`); }
function ok2xx(r)            { return r.status >= 200 && r.status < 300; }
function assert2xx(r, label) { ok2xx(r) ? pass(`${label} (HTTP ${r.status})`) : fail(label, r.data?.error ?? r.data); return ok2xx(r); }
function idOf(r)             { return r.data?.data?.id ?? r.data?.id ?? null; }

// ─── 0. Auth ─────────────────────────────────────────────────────────────────
async function testAuth() {
  section('0. AUTH — login');

  // Try register first (idempotent — ignore if already exists)
  await req('POST', '/auth/register', {
    email:         EMAIL,
    password:      PASS,
    fullName:      'M1 Test Admin',
    workspaceName: 'M1 Test Workspace',
    legalName:     'M1 Test Workspace Pty Ltd',
  });

  const login = await req('POST', '/auth/login', { email: EMAIL, password: PASS });
  if (!assert2xx(login, 'POST /auth/login')) {
    console.log('\n  ⛔ Cannot proceed without auth. Aborting.\n');
    process.exit(1);
  }
  assert2xx(await req('GET', '/auth/me'), 'GET /auth/me');
}

// ─── 1. Cases CRUD ──────────────────────────────────────────────────────────
let programCaseId    = null;
let transactionCaseId = null;

async function testCases() {
  section('1. CASES — create, list');

  const c1 = await req('POST', '/cases', {
    caseType: 'PROGRAM_SETUP',
    title:    'AML Program — M1 Test Entity Pty Ltd',
  });
  assert2xx(c1, 'POST /cases (PROGRAM_SETUP)');
  programCaseId = idOf(c1);

  const c2 = await req('POST', '/cases', {
    caseType:          'TRANSACTION_CDD',
    title:             'CDD — John Smith residential sale',
    designatedService: 'Real estate agency',
    partyType:         'individual',
  });
  assert2xx(c2, 'POST /cases (TRANSACTION_CDD)');
  transactionCaseId = idOf(c2);

  const list = await req('GET', '/cases');
  assert2xx(list, 'GET /cases');
  if (ok2xx(list)) {
    const ids = list.data?.data?.map(c => c.id) ?? [];
    ids.includes(programCaseId)
      ? pass('Program case in list')
      : fail('Program case in list', { ids, programCaseId });
    ids.includes(transactionCaseId)
      ? pass('Transaction case in list')
      : fail('Transaction case in list', { ids, transactionCaseId });
  }
}

// ─── 2. Program wizard ───────────────────────────────────────────────────────
let programRunId = null;

async function testProgramWizard() {
  section('2. PROGRAM WIZARD — start & all 5 steps');
  if (!programCaseId) return fail('Program wizard', 'no caseId');

  const start = await req('POST', '/wizard/start', {
    caseId:     programCaseId,
    wizardType: 'PROGRAM_SETUP',
  });
  assert2xx(start, 'POST /wizard/start (PROGRAM_SETUP)');
  programRunId = idOf(start);
  if (!programRunId) return fail('programRunId', start.data);

  // Step 1 — industry
  const s1 = await req('PATCH', `/wizard/${programRunId}/step`, {
    stepKey:  'industry',
    answers:  { industryPathway: 'real_estate' },
    complete: false,
  });
  assert2xx(s1, 'PATCH wizard/step — industry');

  // Step 2 — services
  const s2 = await req('PATCH', `/wizard/${programRunId}/step`, {
    stepKey:  'services',
    answers:  { designatedServices: ['Real estate agency', 'International funds transfer'] },
    complete: false,
  });
  assert2xx(s2, 'PATCH wizard/step — services');

  // Step 3 — structure
  const s3 = await req('PATCH', `/wizard/${programRunId}/step`, {
    stepKey:  'structure',
    answers:  { businessStructure: 'company_pty', staffCount: 12, abn: '12 345 678 901' },
    complete: false,
  });
  assert2xx(s3, 'PATCH wizard/step — structure');

  // Step 4 — locations
  const s4 = await req('PATCH', `/wizard/${programRunId}/step`, {
    stepKey:  'locations',
    answers:  { locations: ['Sydney NSW', 'Melbourne VIC'] },
    complete: false,
  });
  assert2xx(s4, 'PATCH wizard/step — locations');

  // Step 5 — program (final)
  const s5 = await req('PATCH', `/wizard/${programRunId}/step`, {
    stepKey:  'program',
    answers:  {
      existingAmlProgram:      false,
      complianceOfficerNamed:  true,
      riskApproach:            'risk_based',
    },
    complete: true,
  });
  assert2xx(s5, 'PATCH wizard/step — program (complete=true)');

  if (ok2xx(s5)) {
    const rr = s5.data?.data?.routeResult;
    rr?.completionStatus
      ? pass(`routeResult.completionStatus = "${rr.completionStatus}"`)
      : fail('routeResult.completionStatus missing', rr);
    Array.isArray(rr?.outputs) && rr.outputs.length > 0
      ? pass(`routeResult.outputs (${rr.outputs.length} items)`)
      : fail('routeResult.outputs empty', rr);
  }

  // GET run
  const get = await req('GET', `/wizard/${programRunId}`);
  assert2xx(get, `GET /wizard/${programRunId}`);
  get.data?.data?.run?.status === 'COMPLETED'
    ? pass('Wizard run status = COMPLETED')
    : fail('Wizard run status not COMPLETED', get.data?.data?.run?.status);

  // GET by case
  const byCase = await req('GET', `/wizard/case/${programCaseId}`);
  assert2xx(byCase, `GET /wizard/case/${programCaseId}`);
}

// ─── 3. Transaction wizard ───────────────────────────────────────────────────
let txRunId = null;

async function testTransactionWizard() {
  section('3. TRANSACTION/CDD WIZARD — start & all 4 steps');
  if (!transactionCaseId) return fail('Transaction wizard', 'no caseId');

  const start = await req('POST', '/wizard/start', {
    caseId:     transactionCaseId,
    wizardType: 'TRANSACTION_CDD',
  });
  assert2xx(start, 'POST /wizard/start (TRANSACTION_CDD)');
  txRunId = idOf(start);
  if (!txRunId) return fail('txRunId', start.data);

  // Step 1 — service
  const s1 = await req('PATCH', `/wizard/${txRunId}/step`, {
    stepKey:  'service',
    answers:  { designatedService: 'Real estate agency' },
    complete: false,
  });
  assert2xx(s1, 'PATCH wizard/step — service');

  // Step 2 — party
  const s2 = await req('PATCH', `/wizard/${txRunId}/step`, {
    stepKey:  'party',
    answers:  { providedFor: 'individual', customerIsNew: true, beneficialOwnersKnown: true },
    complete: false,
  });
  assert2xx(s2, 'PATCH wizard/step — party');

  // Step 3 — risk (PEP flagged)
  const s3 = await req('PATCH', `/wizard/${txRunId}/step`, {
    stepKey:  'risk',
    answers:  {
      politicallyExposedPerson: true,
      adverseMedia:             false,
      highRiskJurisdiction:     false,
      complexOwnership:         false,
      sourceOfFundsRequired:    true,
    },
    complete: false,
  });
  assert2xx(s3, 'PATCH wizard/step — risk (PEP=true)');

  // Step 4 — transaction (final, >$10k triggers TTR signal)
  const s4 = await req('PATCH', `/wizard/${txRunId}/step`, {
    stepKey:  'transaction',
    answers:  { transactionValue: 950000, currency: 'AUD' },
    complete: true,
  });
  assert2xx(s4, 'PATCH wizard/step — transaction (complete=true, $950k)');

  if (ok2xx(s4)) {
    const rr = s4.data?.data?.routeResult;
    rr?.riskLevel
      ? pass(`routeResult.riskLevel = "${rr.riskLevel}"`)
      : fail('routeResult.riskLevel missing', rr);
    rr?.riskLevel === 'high'
      ? pass('High risk correctly flagged for PEP + high value')
      : fail(`Expected riskLevel=high, got "${rr?.riskLevel}"`, rr);
    Array.isArray(rr?.recommendedChecks) && rr.recommendedChecks.includes('kyc')
      ? pass('KYC check recommended for individual')
      : fail('KYC not in recommendedChecks', rr?.recommendedChecks);
  }
}

// ─── 4. Case summary ─────────────────────────────────────────────────────────
async function testCaseSummary() {
  section('4. CASE SUMMARY');
  if (!programCaseId) return fail('Case summary', 'no programCaseId');

  const s = await req('GET', `/cases/${programCaseId}/summary`);
  assert2xx(s, `GET /cases/${programCaseId}/summary`);

  if (ok2xx(s)) {
    const data = s.data?.data;
    data?.case?.id === programCaseId
      ? pass('summary.case.id matches')
      : fail('summary.case.id mismatch', data?.case?.id);
    Array.isArray(data?.wizardRuns) && data.wizardRuns.length > 0
      ? pass(`summary.wizardRuns (${data.wizardRuns.length})`)
      : fail('summary.wizardRuns empty', data?.wizardRuns);
    Array.isArray(data?.audit)
      ? pass(`summary.audit (${data.audit.length} events)`)
      : fail('summary.audit missing', data?.audit);
  }
}

// ─── 5. Didit sessions ───────────────────────────────────────────────────────
let diditSessionId = null;

async function testDidit() {
  section('5. DIDIT — create session, list, mock-complete');
  if (!transactionCaseId) return fail('Didit session', 'no transactionCaseId');

  const create = await req('POST', '/providers/didit/session', {
    caseId:     transactionCaseId,
    capability: 'kyc',
    subjectId:  'individual-john-smith-001',
    contactDetails: { email: 'john.smith@example.com' },
    reason:     'CDD — M1 Test — residential sale $950k PEP individual',
  });
  assert2xx(create, 'POST /providers/didit/session (kyc)');
  diditSessionId = create.data?.data?.session?.id ?? idOf(create);

  // AML screening session (second check)
  const create2 = await req('POST', '/providers/didit/session', {
    caseId:     transactionCaseId,
    capability: 'aml_screening',
    subjectId:  'individual-john-smith-001',
    reason:     'PEP/Sanctions screening — M1 Test',
  });
  assert2xx(create2, 'POST /providers/didit/session (aml_screening)');

  // List sessions
  const list = await req('GET', `/providers/didit/sessions?caseId=${transactionCaseId}`);
  assert2xx(list, 'GET /providers/didit/sessions?caseId=...');

  if (ok2xx(list)) {
    const sessions = list.data?.data ?? [];
    sessions.length >= 2
      ? pass(`${sessions.length} didit sessions listed for case`)
      : fail(`Expected ≥2 sessions, got ${sessions.length}`, sessions.map(s => s.capability));
  }

  // Mock complete first session
  if (diditSessionId) {
    const mock = await req('POST', `/providers/didit/mock-complete/${diditSessionId}`, {
      outcome: 'Approved',
    });
    assert2xx(mock, `POST /providers/didit/mock-complete/${diditSessionId} (Approved)`);

    if (ok2xx(mock)) {
      const result = mock.data?.result;
      result?.stored
        ? pass('Didit mock-complete: result.stored = true')
        : fail('Didit mock-complete: result.stored missing', mock.data);
    }
  }

  // Idempotency — try creating same session again (should 409 or reuse)
  const idem = await req('POST', '/providers/didit/session', {
    caseId:     transactionCaseId,
    capability: 'kyc',
    subjectId:  'individual-john-smith-001',
    reason:     'CDD — M1 Test — residential sale $950k PEP individual',
  });
  [200, 201, 409].includes(idem.status)
    ? pass(`Idempotency: POST /session (same key) → HTTP ${idem.status}`)
    : fail('Idempotency: unexpected status', { status: idem.status, data: idem.data });
}

// ─── 6. PDF generation ───────────────────────────────────────────────────────
async function testPdf() {
  section('6. PDF GENERATION');
  if (!programCaseId) return fail('PDF', 'no programCaseId');

  const pdfRes = await fetch(`${BASE}/cases/${programCaseId}/pdf`, {
    headers: { Cookie: cookieHeader() },
  });
  parseCookies(pdfRes.headers);
  const contentType = pdfRes.headers.get('content-type') ?? '';
  const body        = await pdfRes.arrayBuffer();

  pdfRes.status >= 200 && pdfRes.status < 300
    ? pass(`GET /cases/${programCaseId}/pdf (HTTP ${pdfRes.status})`)
    : fail(`GET /cases/${programCaseId}/pdf`, { status: pdfRes.status });

  contentType.includes('pdf')
    ? pass(`Content-Type: ${contentType}`)
    : fail('Content-Type not PDF', contentType);

  const magic = Buffer.from(body).slice(0, 4).toString();
  magic === '%PDF'
    ? pass('PDF magic bytes valid (%PDF)')
    : fail('PDF magic bytes invalid', magic);
}

// ─── 7. Case updated from wizard ─────────────────────────────────────────────
async function testCaseUpdated() {
  section('7. CASE STATUS AFTER WIZARD');

  const caseData = await req('GET', `/cases/${transactionCaseId}/summary`);
  assert2xx(caseData, 'GET /cases/:id/summary (transaction case)');
  if (ok2xx(caseData)) {
    const c = caseData.data?.data?.case;
    c?.status && c.status !== 'DRAFT'
      ? pass(`Case status = "${c.status}" (not DRAFT after wizard)`)
      : fail('Case still DRAFT after wizard completion', c?.status);
    c?.riskLevel && c.riskLevel !== 'not_assessed'
      ? pass(`Case riskLevel = "${c.riskLevel}"`)
      : fail('riskLevel still not_assessed', c?.riskLevel);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║   Integrity Solve — Milestone 1 API Test Suite                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  await testAuth();
  await testCases();
  await testProgramWizard();
  await testTransactionWizard();
  await testCaseSummary();
  await testDidit();
  await testPdf();
  await testCaseUpdated();

  const total = passCount + failCount;
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log(`║  RESULTS: ${passCount}/${total} passed, ${failCount} failed${' '.repeat(Math.max(0, 37 - String(passCount).length - String(total).length - String(failCount).length))}║`);
  console.log('╚════════════════════════════════════════════════════════════════╝');
  if (failures.length > 0) {
    console.log('\n  Failures:');
    for (const f of failures) console.log(f);
  }
  process.exit(failCount > 0 ? 1 : 0);
})();
