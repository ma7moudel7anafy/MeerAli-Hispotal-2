import fs from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';
import express from 'express';
import { JsonDatabaseEngine } from '../server/jsonDatabaseEngine';

// Isolated sandbox environment for HTTP tests
const TEST_SANDBOX_DIR = path.resolve(process.cwd(), 'data', 'http_test_sandbox');
const TEST_PORT = 3199;
const TEST_HOST = '127.0.0.1';
const TEST_BASE = `http://${TEST_HOST}:${TEST_PORT}`;

function requestHttp(method: string, urlPath: string, body?: any): Promise<{ status: number; headers: any; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, TEST_BASE);
    const postData = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
        },
      },
      res => {
        let raw = '';
        res.on('data', chunk => (raw += chunk));
        res.on('end', () => {
          let data = raw;
          try {
            data = JSON.parse(raw);
          } catch {}
          resolve({ status: res.statusCode || 0, headers: res.headers, data });
        });
      }
    );
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function listenToSse(durationMs: number): Promise<{ events: any[]; close: () => void }> {
  return new Promise((resolve, reject) => {
    const events: any[] = [];
    const req = http.request(
      new URL('/api/events', TEST_BASE),
      {
        method: 'GET',
        headers: { Accept: 'text/event-stream' },
      },
      res => {
        let buffer = '';
        res.on('data', chunk => {
          buffer += chunk.toString();
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const dataMatch = line.match(/^data: (.*)$/m);
            if (dataMatch) {
              try {
                events.push(JSON.parse(dataMatch[1]));
              } catch {}
            }
          }
        });
      }
    );

    req.on('error', reject);
    req.end();

    const close = () => {
      req.destroy();
    };

    setTimeout(() => {
      resolve({ events, close });
    }, durationMs);
  });
}

async function runIsolatedHttpTests() {
  console.log('================================================================');
  console.log('🧪 ISOLATED HTTP & ENGINE TEST SUITE (ZERO POLLUTION)');
  console.log(`Port: ${TEST_PORT}, Isolated Dir: ${TEST_SANDBOX_DIR}`);
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  // 1. Prepare isolated sandbox
  if (fs.existsSync(TEST_SANDBOX_DIR)) {
    fs.rmSync(TEST_SANDBOX_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_SANDBOX_DIR, { recursive: true });

  // Copy initial seed to isolated sandbox so test starts with doctors/specialties
  const seedSrc = path.resolve(process.cwd(), 'data', 'initial_seed.json');
  const isolatedDbFile = path.resolve(TEST_SANDBOX_DIR, 'hospital_db.json');
  fs.copyFileSync(seedSrc, isolatedDbFile);

  // 2. Instantiate engine and isolated Express server
  const testEngine = new JsonDatabaseEngine({
    dataDir: TEST_SANDBOX_DIR,
    dbFilename: 'hospital_db.json',
    seedFilename: 'initial_seed.json',
    autoBackupIntervalMs: 0, // no auto timer in test
  });

  await testEngine.init();

  const testApp = express();
  testApp.use(express.json());

  // Recovery guard middleware
  testApp.use((req: any, res: any, next: any) => {
    if (testEngine.isRecovery()) {
      if (req.path.startsWith('/api/recovery') || req.path === '/api/status') {
        return next();
      }
      return res.status(503).json({
        error: 'SERVICE_UNAVAILABLE_RECOVERY_MODE',
        recoveryReason: testEngine.getRecoveryReason(),
      });
    }
    next();
  });

  // Test SSE broadcast
  const sseClients = new Set<any>();
  function broadcast(type: string, payload: any) {
    const msg = `data: ${JSON.stringify({ type, payload, timestamp: Date.now() })}\n\n`;
    for (const c of sseClients) {
      try { c.write(msg); } catch { sseClients.delete(c); }
    }
  }

  testApp.get('/api/events', (req: any, res: any) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
  });

  testApp.get('/api/status', (req: any, res: any) => {
    const db = testEngine.getDbSnapshot();
    const recovery = testEngine.getRecoveryStatus();
    res.json({
      status: recovery.isRecoveryMode ? 'recovery_mode' : 'online',
      attendanceCount: db.attendance?.length || 0,
      visitsCount: db.visits?.length || 0,
      patientsCount: db.patients?.length || 0,
      recovery,
    });
  });

  testApp.get('/api/patients', (req: any, res: any) => {
    res.json(testEngine.getPatients());
  });

  testApp.post('/api/patients', async (req: any, res: any) => {
    try {
      const data = req.body;
      if (!data || !data.id) return res.status(400).json({ error: 'id required' });
      const saved = await testEngine.savePatient(data);
      broadcast('hospital-patient-updated', { patient: saved });
      res.json({ success: true, data: saved });
    } catch (err: any) {
      const code = err.statusCode || (err.message?.includes('Validation Error') ? 400 : 500);
      res.status(code).json({ error: err.message });
    }
  });

  testApp.get('/api/visits', (req: any, res: any) => {
    const list = testEngine.getVisits(req.query);
    res.json(list);
  });

  testApp.post('/api/visits', async (req: any, res: any) => {
    try {
      const data = req.body;
      if (!data || !data.id) return res.status(400).json({ error: 'id required' });
      const saved = await testEngine.saveVisit(data);
      broadcast('hospital-visit-updated', { visit: saved });
      res.json({ success: true, data: saved });
    } catch (err: any) {
      const code = err.statusCode || (err.message?.includes('Validation Error') ? 400 : 500);
      res.status(code).json({ error: err.message });
    }
  });

  testApp.get('/api/attendance', (req: any, res: any) => {
    res.json(testEngine.getAttendance(req.query.date));
  });

  testApp.post('/api/attendance', async (req: any, res: any) => {
    try {
      const saved = await testEngine.saveAttendance(req.body);
      broadcast('hospital-attendance-updated', { record: saved });
      res.json({ success: true, data: saved });
    } catch (err: any) {
      const code = err.statusCode || (err.message?.includes('Validation Error') ? 400 : 500);
      res.status(code).json({ error: err.message });
    }
  });

  // Start isolated test server
  const server = http.createServer(testApp);
  await new Promise<void>((resolve) => {
    server.listen(TEST_PORT, TEST_HOST, () => resolve());
  });

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Creation, Persistence & Exact Response Shape Check
    // ------------------------------------------------------------------------
    console.log('TEST 1: Creating patient, visit, and attendance on isolated server...');
    const patientPayload = {
      id: 'pat-iso-101',
      full_name: 'سعيد عبد الله النجار',
      phone: '01011223344',
      gender: 'male',
      age: 42,
    };
    const patRes = await requestHttp('POST', '/api/patients', patientPayload);
    if (patRes.status !== 200 || !patRes.data.success || patRes.data.data.id !== 'pat-iso-101') {
      throw new Error(`Patient creation mismatch: ${JSON.stringify(patRes.data)}`);
    }

    const visitPayload = {
      id: 'vis-iso-202',
      patient_id: 'pat-iso-101',
      patient_name: 'سعيد عبد الله النجار',
      patient_phone: '01011223344',
      doctor_id: 'doc-01',
      doctor_name: 'د. محمد عبد الرحمن الدسوقي',
      specialty_id: 'spec-01',
      specialty_name: 'الباطنة العامة والجهاز الهضمي',
      visit_date: '2026-11-04',
      status: 'registered',
      ticket_price: 50,
      payment_status: 'paid',
    };
    const visRes = await requestHttp('POST', '/api/visits', visitPayload);
    if (visRes.status !== 200 || !visRes.data.success || visRes.data.data.id !== 'vis-iso-202') {
      throw new Error(`Visit creation mismatch: ${JSON.stringify(visRes.data)}`);
    }

    const attPayload = {
      doctorId: 'doc-01',
      attendanceDate: '2026-11-04',
      status: 'present',
      delayExpectedTime: null,
      internalNotes: 'حضور مؤكد للاختبار',
      updaterDisplayName: 'موظف الاستقبال',
    };
    const attRes = await requestHttp('POST', '/api/attendance', attPayload);
    if (attRes.status !== 200 || !attRes.data.success || attRes.data.data.doctor_id !== 'doc-01') {
      throw new Error(`Attendance creation mismatch: ${JSON.stringify(attRes.data)}`);
    }

    // Read back via GET
    const getPat = await requestHttp('GET', '/api/patients');
    if (!Array.isArray(getPat.data) || !getPat.data.some(p => p.id === 'pat-iso-101')) {
      throw new Error('GET /api/patients did not include pat-iso-101');
    }

    const getVis = await requestHttp('GET', '/api/visits?patientId=pat-iso-101');
    if (!Array.isArray(getVis.data) || !getVis.data.some(v => v.id === 'vis-iso-202')) {
      throw new Error('GET /api/visits did not include vis-iso-202');
    }

    const getAtt = await requestHttp('GET', '/api/attendance?date=2026-11-04');
    if (!Array.isArray(getAtt.data) || !getAtt.data.some(a => a.doctor_id === 'doc-01')) {
      throw new Error('GET /api/attendance did not include attendance');
    }

    // Check physical file in isolated sandbox
    const diskContent = JSON.parse(fs.readFileSync(isolatedDbFile, 'utf-8'));
    if (!diskContent.patients.some((p: any) => p.id === 'pat-iso-101')) throw new Error('Patient not written to isolated disk!');
    if (!diskContent.visits.some((v: any) => v.id === 'vis-iso-202')) throw new Error('Visit not written to isolated disk!');
    if (!diskContent.attendance.some((a: any) => a.doctor_id === 'doc-01' && a.attendance_date === '2026-11-04')) {
      throw new Error('Attendance not written to isolated disk!');
    }

    console.log('  ✅ PASSED: Isolated HTTP create/read succeeded. Saved to isolated sandbox. Shapes verified.');
    passed++;

    // ------------------------------------------------------------------------
    // TEST 2: Absence of Access-Control-Allow-Origin: * Header
    // ------------------------------------------------------------------------
    console.log('\nTEST 2: Verifying absence of Access-Control-Allow-Origin: * on main server (127.0.0.1:3000)...');
    const mainServerRes = await new Promise<{ headers: any }>((resolve, reject) => {
      http.get('http://127.0.0.1:3000/api/status', (res) => {
        resolve({ headers: res.headers });
      }).on('error', reject);
    });

    if (mainServerRes.headers['access-control-allow-origin']) {
      throw new Error(`CORS header Access-Control-Allow-Origin was found: ${mainServerRes.headers['access-control-allow-origin']}`);
    }
    console.log('  ✅ PASSED: Access-Control-Allow-Origin: * is completely removed.');
    passed++;

    // ------------------------------------------------------------------------
    // TEST 3: Process Lock - Rejecting Second Server on Same Data Directory
    // ------------------------------------------------------------------------
    console.log('\nTEST 3: Testing single-instance process lock on same data directory...');
    let secondInstanceCaught = false;
    try {
      const secondEngine = new JsonDatabaseEngine({
        dataDir: TEST_SANDBOX_DIR,
        dbFilename: 'hospital_db.json',
      });
      await secondEngine.init();
    } catch (err: any) {
      if (err.message.includes('Another hospital server instance is currently running')) {
        secondInstanceCaught = true;
      } else {
        throw err;
      }
    }

    if (!secondInstanceCaught) {
      throw new Error('Failed to prevent second server instance on same data directory!');
    }
    console.log('  ✅ PASSED: Second instance was blocked by lockfile from accessing data.');
    passed++;

    // ------------------------------------------------------------------------
    // TEST 4: Missing hospital_db.json with Backups -> Recovery Mode (503)
    // ------------------------------------------------------------------------
    console.log('\nTEST 4: Testing missing hospital_db.json when backups exist...');
    const recoverySandbox = path.resolve(process.cwd(), 'data', 'recovery_guard_sandbox');
    if (fs.existsSync(recoverySandbox)) fs.rmSync(recoverySandbox, { recursive: true, force: true });
    fs.mkdirSync(path.resolve(recoverySandbox, 'backups'), { recursive: true });

    // Put a dummy backup in backups/
    fs.writeFileSync(
      path.resolve(recoverySandbox, 'backups', 'hospital_db_2026-11-01T00-00-00-000Z_manual.json'),
      JSON.stringify(diskContent),
      'utf-8'
    );

    // Notice: hospital_db.json does NOT exist in recoverySandbox!
    const guardEngine = new JsonDatabaseEngine({
      dataDir: recoverySandbox,
      dbFilename: 'hospital_db.json',
      seedFilename: 'initial_seed.json',
      autoBackupIntervalMs: 0,
    });
    await guardEngine.init();

    if (!guardEngine.isRecovery()) {
      throw new Error('Engine failed to enter Recovery Mode when db was missing and backups existed!');
    }
    // Verify it did NOT copy initial_seed.json
    if (fs.existsSync(path.resolve(recoverySandbox, 'hospital_db.json'))) {
      throw new Error('Engine copied seed over missing db despite existing backups!');
    }

    // Verify 503 response on write
    let write503Caught = false;
    try {
      await guardEngine.savePatient({ id: 'p1', full_name: 'test' });
    } catch (err: any) {
      if (err.statusCode === 503) write503Caught = true;
    }
    if (!write503Caught) throw new Error('Write in Recovery Mode did not throw 503 error!');

    guardEngine.releaseProcessLock();
    fs.rmSync(recoverySandbox, { recursive: true, force: true });
    console.log('  ✅ PASSED: Missing file with existing backups entered Recovery Mode. Writes rejected with 503. Seed not used.');
    passed++;

    // ------------------------------------------------------------------------
    // TEST 5: Simulated fsync / rename Failures
    // ------------------------------------------------------------------------
    console.log('\nTEST 5: Testing simulated rename/fsync failure handling...');
    const failureSandbox = path.resolve(process.cwd(), 'data', 'fail_sim_sandbox');
    if (fs.existsSync(failureSandbox)) fs.rmSync(failureSandbox, { recursive: true, force: true });
    fs.mkdirSync(failureSandbox, { recursive: true });
    fs.writeFileSync(path.resolve(failureSandbox, 'hospital_db.json'), JSON.stringify(diskContent), 'utf-8');

    const failEngine = new JsonDatabaseEngine({
      dataDir: failureSandbox,
      dbFilename: 'hospital_db.json',
      autoBackupIntervalMs: 0,
    });
    await failEngine.init();

    // Cause write to fail by creating a directory where the .tmp file is expected
    const tmpPath = path.resolve(failureSandbox, 'hospital_db.json.tmp');
    fs.mkdirSync(tmpPath);

    let caughtSaveErr = false;
    try {
      await failEngine.savePatient({ id: 'pat-fail-rename', full_name: 'مريض الفشل' });
    } catch {
      caughtSaveErr = true;
    }

    fs.rmSync(tmpPath, { recursive: true, force: true });

    if (!caughtSaveErr) throw new Error('Save did not reject when .tmp was blocked!');
    // Verify in-memory did not mutate
    const snap = failEngine.getDbSnapshot();
    if (snap.patients.some((p: any) => p.id === 'pat-fail-rename')) {
      throw new Error('Memory mutated despite save failure!');
    }

    failEngine.releaseProcessLock();
    fs.rmSync(failureSandbox, { recursive: true, force: true });
    console.log('  ✅ PASSED: Failure during atomic write properly rejected. In-memory state protected.');
    passed++;

    // ------------------------------------------------------------------------
    // TEST 6: Startup Backup Creation & /api/status Metadata
    // ------------------------------------------------------------------------
    console.log('\nTEST 6: Testing startup backup creation and /api/status caching...');
    const statusRes = await requestHttp('GET', '/api/status');
    const latestBkp = statusRes.data.recovery?.latestBackup;

    if (!latestBkp || latestBkp.status !== 'success' || !latestBkp.filename?.includes('startup')) {
      throw new Error(`Startup backup metadata missing or not success: ${JSON.stringify(latestBkp)}`);
    }
    console.log(`  ✅ PASSED: Startup backup automatically taken (${latestBkp.filename}) and verified in status.`);
    passed++;

    // ------------------------------------------------------------------------
    // TEST 7: Stale, Empty, Corrupted, and Active Process Lock Scenarios
    // ------------------------------------------------------------------------
    console.log('\nTEST 7: Testing process lock scenarios (Dead PID, Empty, Corrupted, Active PID)...');
    const lockTestDir = path.resolve(process.cwd(), 'data', 'lock_test_sandbox');
    if (fs.existsSync(lockTestDir)) fs.rmSync(lockTestDir, { recursive: true, force: true });
    fs.mkdirSync(lockTestDir, { recursive: true });
    fs.copyFileSync(seedSrc, path.resolve(lockTestDir, 'hospital_db.json'));

    const lockFilePath = path.resolve(lockTestDir, 'hospital_db.json.lock');

    // 7.1 Dead / Non-existent PID
    console.log('  Subtest 7.1: Stale lock file with non-existent (dead) PID...');
    fs.writeFileSync(lockFilePath, JSON.stringify({ pid: 99999999, startedAt: '2026-01-01T00:00:00.000Z' }), 'utf-8');
    const deadPidEngine = new JsonDatabaseEngine({ dataDir: lockTestDir, autoBackupIntervalMs: 0 });
    await deadPidEngine.init();
    const deadPidLockContent = JSON.parse(fs.readFileSync(lockFilePath, 'utf-8'));
    if (deadPidLockContent.pid !== process.pid) {
      throw new Error(`Expected lock file to be re-acquired with PID ${process.pid}, but found ${deadPidLockContent.pid}`);
    }
    deadPidEngine.releaseProcessLock();
    console.log('    ✓ Recovered from dead PID lock file successfully.');

    // 7.2 Empty lock file (0 bytes)
    console.log('  Subtest 7.2: Stale lock file with empty (0 bytes) content...');
    fs.writeFileSync(lockFilePath, '', 'utf-8');
    const emptyLockEngine = new JsonDatabaseEngine({ dataDir: lockTestDir, autoBackupIntervalMs: 0 });
    await emptyLockEngine.init();
    const emptyLockContent = JSON.parse(fs.readFileSync(lockFilePath, 'utf-8'));
    if (emptyLockContent.pid !== process.pid) {
      throw new Error(`Expected lock file to be re-acquired with PID ${process.pid}, but found ${emptyLockContent.pid}`);
    }
    emptyLockEngine.releaseProcessLock();
    console.log('    ✓ Recovered from empty lock file successfully.');

    // 7.3 Corrupted JSON in lock file
    console.log('  Subtest 7.3: Corrupted JSON content in lock file...');
    fs.writeFileSync(lockFilePath, '{"pid": 1234, "corrupted: unclosed json', 'utf-8');
    const corruptLockEngine = new JsonDatabaseEngine({ dataDir: lockTestDir, autoBackupIntervalMs: 0 });
    await corruptLockEngine.init();
    const corruptLockContent = JSON.parse(fs.readFileSync(lockFilePath, 'utf-8'));
    if (corruptLockContent.pid !== process.pid) {
      throw new Error(`Expected lock file to be re-acquired with PID ${process.pid}, but found ${corruptLockContent.pid}`);
    }
    corruptLockEngine.releaseProcessLock();
    console.log('    ✓ Recovered from corrupted lock file successfully.');

    // 7.4 Multi-instance lock retention: Instance A runs, B fails without deleting lock, C fails, A stops and lock removed
    console.log('  Subtest 7.4: Multi-instance contention (Instance A runs, B fails without deleting lock, C fails, A stops)...');
    const instanceA = new JsonDatabaseEngine({ dataDir: lockTestDir, autoBackupIntervalMs: 0 });
    await instanceA.init();
    if (!fs.existsSync(lockFilePath)) {
      throw new Error('Lock file should exist after Instance A initializes!');
    }

    // Instance B attempts to start and fails
    let instanceBFailed = false;
    let bErrorMsg = '';
    const instanceB = new JsonDatabaseEngine({ dataDir: lockTestDir, autoBackupIntervalMs: 0 });
    try {
      await instanceB.init();
    } catch (err: any) {
      instanceBFailed = true;
      bErrorMsg = err.message;
    }
    if (!instanceBFailed) throw new Error('Instance B should have failed with lock error!');
    if (!bErrorMsg.includes('Operator Guide')) throw new Error('Instance B error missing Operator Guide');

    // Instance B calls releaseProcessLock - MUST NOT delete Instance A's lock!
    instanceB.releaseProcessLock();
    if (!fs.existsSync(lockFilePath)) {
      throw new Error('CRITICAL BUG: Instance B deleted Instance A\'s active lock file!');
    }
    console.log('    ✓ Instance B failed safely and did NOT delete Instance A\'s lock file.');

    // Instance C attempts to start and also fails
    let instanceCFailed = false;
    const instanceC = new JsonDatabaseEngine({ dataDir: lockTestDir, autoBackupIntervalMs: 0 });
    try {
      await instanceC.init();
    } catch {
      instanceCFailed = true;
    }
    if (!instanceCFailed) throw new Error('Instance C should have failed with lock error!');
    instanceC.releaseProcessLock();
    if (!fs.existsSync(lockFilePath)) {
      throw new Error('CRITICAL BUG: Instance C deleted Instance A\'s active lock file!');
    }
    console.log('    ✓ Instance C also blocked and lock file remains intact.');

    // Now Instance A stops -> lock file MUST disappear
    instanceA.releaseProcessLock();
    if (fs.existsSync(lockFilePath)) {
      throw new Error('Lock file should have been deleted after Instance A released it!');
    }
    console.log('    ✓ Instance A stopped and lock file cleanly unlinked.');

    // 7.5 Condition (a): PID in lock file equals current process.pid
    console.log('  Subtest 7.5: Stale lock where PID equals current process.pid (previous crash in same process)...');
    fs.writeFileSync(
      lockFilePath,
      JSON.stringify({ pid: process.pid, startedAt: new Date(Date.now() - 30000).toISOString() }),
      'utf-8'
    );
    const engineSamePid = new JsonDatabaseEngine({ dataDir: lockTestDir, autoBackupIntervalMs: 0 });
    await engineSamePid.init();
    const samePidLock = JSON.parse(fs.readFileSync(lockFilePath, 'utf-8'));
    if (samePidLock.pid !== process.pid) {
      throw new Error('Engine should have acquired lock after clearing same-PID stale lock');
    }
    engineSamePid.releaseProcessLock();
    if (fs.existsSync(lockFilePath)) {
      throw new Error('Lock file should be unlinked after release');
    }
    console.log('    ✓ Recovered from stale lock with current process.pid successfully.');

    // 7.6 Condition (b): startedAt in lock is older than system boot time
    console.log('  Subtest 7.6: Stale lock where startedAt is older than system boot time...');
    const bootTimeMs = Date.now() - (os.uptime() * 1000);
    const preBootDate = new Date(bootTimeMs - (3600 * 1000)).toISOString(); // 1 hour before boot
    fs.writeFileSync(
      lockFilePath,
      JSON.stringify({ pid: 88888888, startedAt: preBootDate }),
      'utf-8'
    );
    const enginePreBoot = new JsonDatabaseEngine({ dataDir: lockTestDir, autoBackupIntervalMs: 0 });
    await enginePreBoot.init();
    const preBootLock = JSON.parse(fs.readFileSync(lockFilePath, 'utf-8'));
    if (preBootLock.pid !== process.pid) {
      throw new Error('Engine should have acquired lock after clearing pre-boot stale lock');
    }
    enginePreBoot.releaseProcessLock();
    if (fs.existsSync(lockFilePath)) {
      throw new Error('Lock file should be unlinked after release');
    }
    console.log('    ✓ Recovered from pre-boot stale lock successfully.');

    if (fs.existsSync(lockTestDir)) fs.rmSync(lockTestDir, { recursive: true, force: true });

    console.log('  ✅ PASSED: All process lock edge cases, ownership guards, and stale boot checks validated.');
    passed++;

  } finally {
    // Teardown isolated test server and release lock
    testEngine.releaseProcessLock();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    // Remove isolated test sandbox
    if (fs.existsSync(TEST_SANDBOX_DIR)) {
      fs.rmSync(TEST_SANDBOX_DIR, { recursive: true, force: true });
    }
  }

  console.log('\n================================================================');
  console.log(`🏁 ISOLATED TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runIsolatedHttpTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
