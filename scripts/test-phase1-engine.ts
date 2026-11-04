import fs from 'fs';
import path from 'path';
import { JsonDatabaseEngine } from '../server/jsonDatabaseEngine';

const TEST_DIR = path.resolve(process.cwd(), 'data', 'test_sandbox');
const SEED_FILE = path.resolve(process.cwd(), 'data', 'initial_seed.json');

function cleanupTestSandbox(recreate = true) {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  if (recreate) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }
}

async function runAllPhase1Tests() {
  console.log('================================================================');
  console.log('🧪 MEETALI-HOSPITAL 2 - PHASE 1 TEST SUITE (STORAGE ENGINE)');
  console.log(`OS: ${process.platform} (${process.arch}), Node.js: ${process.version}`);
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  cleanupTestSandbox();

  // --------------------------------------------------------------------------
  // TEST 1: Concurrent Writes with Zero Lost Updates (Mutex & Write Queue)
  // --------------------------------------------------------------------------
  try {
    console.log('TEST 1: Testing concurrent writes with zero lost updates...');
    const engine1 = new JsonDatabaseEngine({
      dataDir: TEST_DIR,
      dbFilename: 'test1_db.json',
      seedFilename: 'initial_seed.json',
      autoBackupIntervalMs: 0,
    });
    await engine1.init();

    const CONCURRENT_COUNT = 15;
    const writePromises: Promise<any>[] = [];

    for (let i = 1; i <= CONCURRENT_COUNT; i++) {
      const patient = {
        id: `pat-concurrent-${i}`,
        full_name: `مريض متزامن رقم ${i}`,
        phone: `010000000${String(i).padStart(2, '0')}`,
        gender: 'male',
        created_at: new Date().toISOString(),
      };
      writePromises.push(engine1.savePatient(patient));
    }

    // Execute all 15 writes simultaneously
    const results = await Promise.all(writePromises);
    if (results.length !== CONCURRENT_COUNT) {
      throw new Error(`Expected ${CONCURRENT_COUNT} write results, got ${results.length}`);
    }

    // Direct Disk Read Verification (Bypass memory to ensure physical disk persistence)
    const diskContent = JSON.parse(fs.readFileSync(path.resolve(TEST_DIR, 'test1_db.json'), 'utf-8'));
    const savedIds = new Set(diskContent.patients.map((p: any) => p.id));

    for (let i = 1; i <= CONCURRENT_COUNT; i++) {
      if (!savedIds.has(`pat-concurrent-${i}`)) {
        throw new Error(`Missing record pat-concurrent-${i} on disk! Race condition occurred.`);
      }
    }

    console.log(`  ✅ PASSED: All ${CONCURRENT_COUNT} concurrent writes succeeded and were verified directly on disk.`);
    engine1.releaseProcessLock();
    passed++;
  } catch (err: any) {
    console.error(`  ❌ FAILED Test 1:`, err.message);
    failed++;
  }

  // --------------------------------------------------------------------------
  // TEST 2: Simulated Disk Write Failure (Memory Intact, Previous Data Preserved)
  // --------------------------------------------------------------------------
  try {
    console.log('\nTEST 2: Testing simulated write failure during atomic save...');
    const engine2 = new JsonDatabaseEngine({
      dataDir: TEST_DIR,
      dbFilename: 'test2_db.json',
      seedFilename: 'initial_seed.json',
      autoBackupIntervalMs: 0,
    });
    await engine2.init();

    // 1. Save an initial valid patient
    await engine2.savePatient({
      id: 'pat-initial-safe',
      full_name: 'مريض أولي آمن',
      phone: '01011111111',
    });

    const memoryBeforeFailure = engine2.getDbSnapshot();
    const diskRawBeforeFailure = fs.readFileSync(path.resolve(TEST_DIR, 'test2_db.json'), 'utf-8');

    // 2. Simulate write failure by intentionally creating a directory where the tmp file should be
    //    This causes fs.openSync to fail with EISDIR
    const tmpFilePath = path.resolve(TEST_DIR, 'test2_db.json.tmp');
    fs.mkdirSync(tmpFilePath);

    let caughtError: Error | null = null;
    try {
      await engine2.savePatient({
        id: 'pat-should-fail',
        full_name: 'مريض سيفشل حفظه',
        phone: '01022222222',
      });
    } catch (e: any) {
      caughtError = e;
    }

    // Clean up simulation directory
    if (fs.existsSync(tmpFilePath)) {
      fs.rmSync(tmpFilePath, { recursive: true, force: true });
    }

    if (!caughtError) {
      throw new Error('Expected write to fail with disk error, but it succeeded!');
    }

    // 3. Verify in-memory state was NOT mutated
    const memoryAfterFailure = engine2.getDbSnapshot();
    const patientInMem = memoryAfterFailure.patients.find((p: any) => p.id === 'pat-should-fail');
    if (patientInMem) {
      throw new Error('Memory was mutated despite write failure! Violation of integrity rule.');
    }

    // 4. Verify disk file remains 100% identical and uncorrupted
    const diskRawAfterFailure = fs.readFileSync(path.resolve(TEST_DIR, 'test2_db.json'), 'utf-8');
    if (diskRawBeforeFailure !== diskRawAfterFailure) {
      throw new Error('Disk file was altered during failed save!');
    }

    console.log(`  ✅ PASSED: Write error caught (${caughtError.message}). In-memory state and disk file remained 100% intact.`);
    engine2.releaseProcessLock();
    passed++;
  } catch (err: any) {
    console.error(`  ❌ FAILED Test 2:`, err.message);
    failed++;
  }

  // --------------------------------------------------------------------------
  // TEST 3: Corrupted JSON at Startup & Recovery Mode (Never Overwrite with Seed)
  // --------------------------------------------------------------------------
  try {
    console.log('\nTEST 3: Testing corrupted JSON at startup, quarantine, and recovery mode...');
    const corruptDbPath = path.resolve(TEST_DIR, 'test3_corrupt_db.json');
    // Write syntactically invalid, truncated JSON
    fs.writeFileSync(corruptDbPath, '{"attendance": [ { "id": "broken", incomplete json...', 'utf-8');

    const engine3 = new JsonDatabaseEngine({
      dataDir: TEST_DIR,
      dbFilename: 'test3_corrupt_db.json',
      seedFilename: 'initial_seed.json',
      autoBackupIntervalMs: 0,
    });

    await engine3.init();

    const status = engine3.getRecoveryStatus();
    if (!status.isRecoveryMode) {
      throw new Error('Engine failed to enter Recovery Mode when JSON is corrupt!');
    }
    if (!status.isWritesFrozen) {
      throw new Error('Writes should be frozen in Recovery Mode!');
    }

    // Verify corrupted file was quarantined in data/test_sandbox/corrupted/
    const corruptedDir = path.resolve(TEST_DIR, 'corrupted');
    const quarantinedFiles = fs.readdirSync(corruptedDir).filter(f => f.includes('test3_corrupt_db_corrupted_') || f.includes('_corrupted_'));
    if (quarantinedFiles.length === 0) {
      throw new Error('Corrupted file was not copied to corrupted quarantine directory!');
    }

    // Verify that the file was NOT automatically overwritten with initial_seed.json!
    const contentAfterInit = fs.readFileSync(corruptDbPath, 'utf-8');
    if (contentAfterInit.includes('عيادة الأطفال') || contentAfterInit.includes('د. مصطفى الجوهري')) {
      throw new Error('CRITICAL BUG: Engine silently overwrote corrupted file with seed data!');
    }

    // Verify write rejection in Recovery Mode
    let writeRejected = false;
    try {
      await engine3.savePatient({ id: 'reject-me', full_name: 'مريض مرفوض' });
    } catch {
      writeRejected = true;
    }

    if (!writeRejected) {
      throw new Error('Engine permitted a write while in Recovery Mode!');
    }

    console.log(`  ✅ PASSED: Corrupted JSON detected. File safely quarantined to ${quarantinedFiles[0]}. Writes frozen, and silent seed overwrite prevented.`);
    engine3.releaseProcessLock();
    passed++;
  } catch (err: any) {
    console.error(`  ❌ FAILED Test 3:`, err.message);
    failed++;
  }

  // --------------------------------------------------------------------------
  // TEST 4: Server Restart & Absolute Data Persistence
  // --------------------------------------------------------------------------
  try {
    console.log('\nTEST 4: Testing server restart and cross-session persistence...');
    const restartDbFilename = 'test4_restart_db.json';
    const engine4a = new JsonDatabaseEngine({
      dataDir: TEST_DIR,
      dbFilename: restartDbFilename,
      seedFilename: 'initial_seed.json',
      autoBackupIntervalMs: 0,
    });
    await engine4a.init();

    const persistentPatientId = `pat-restart-test-${Date.now()}`;
    await engine4a.savePatient({
      id: persistentPatientId,
      full_name: 'أحمد محمود العشماوي',
      phone: '01099887766',
      gender: 'male',
    });

    // Simulate complete process termination
    engine4a.stopAutoBackup();
    engine4a.releaseProcessLock();

    // Start a completely new engine instance pointing to the same file
    const engine4b = new JsonDatabaseEngine({
      dataDir: TEST_DIR,
      dbFilename: restartDbFilename,
      seedFilename: 'initial_seed.json',
      autoBackupIntervalMs: 0,
    });
    await engine4b.init();

    const patientsAfterRestart = engine4b.getPatients();
    const reloadedPatient = patientsAfterRestart.find((p: any) => p.id === persistentPatientId);

    if (!reloadedPatient) {
      throw new Error(`Patient ${persistentPatientId} was lost after engine restart!`);
    }
    if (reloadedPatient.full_name !== 'أحمد محمود العشماوي') {
      throw new Error(`Data mismatch after restart: expected 'أحمد محمود العشماوي', got '${reloadedPatient.full_name}'`);
    }

    console.log(`  ✅ PASSED: New engine instance loaded record '${reloadedPatient.full_name}' successfully from disk after restart.`);
    engine4b.releaseProcessLock();
    passed++;
  } catch (err: any) {
    console.error(`  ❌ FAILED Test 4:`, err.message);
    failed++;
  }

  // --------------------------------------------------------------------------
  // TEST 5: Backup Creation, Verification & Restoration
  // --------------------------------------------------------------------------
  try {
    console.log('\nTEST 5: Testing backup creation, integrity verification, and restoration...');
    const backupDbFilename = 'test5_backup_db.json';
    const engine5 = new JsonDatabaseEngine({
      dataDir: TEST_DIR,
      dbFilename: backupDbFilename,
      seedFilename: 'initial_seed.json',
      autoBackupIntervalMs: 0,
    });
    await engine5.init();

    // 1. Add baseline patient
    await engine5.savePatient({
      id: 'pat-before-backup',
      full_name: 'مريض قبل النسخة الاحتياطية',
      phone: '01055555555',
    });

    // 2. Create backup
    const backupResult = engine5.createBackup('manual-test');
    if (!backupResult.success || !backupResult.backupPath) {
      throw new Error(`Backup creation failed: ${backupResult.error}`);
    }

    const backupFilename = path.basename(backupResult.backupPath);
    console.log(`     Backup created: ${backupFilename}`);

    // 3. Mutate database after backup
    await engine5.savePatient({
      id: 'pat-after-backup-temporary',
      full_name: 'مريض أضيف بعد النسخة وسيتم حذفه بالاستعادة',
      phone: '01066666666',
    });

    let currentPatients = engine5.getPatients();
    if (!currentPatients.some((p: any) => p.id === 'pat-after-backup-temporary')) {
      throw new Error('Temporary patient was not saved.');
    }

    // 4. Restore from backup
    const restoreResult = await engine5.restoreFromBackup(backupFilename);
    if (!restoreResult.success) {
      throw new Error(`Restore failed: ${restoreResult.error}`);
    }

    // 5. Verify restored state
    const patientsAfterRestore = engine5.getPatients();
    const hasTemporary = patientsAfterRestore.some((p: any) => p.id === 'pat-after-backup-temporary');
    const hasOriginal = patientsAfterRestore.some((p: any) => p.id === 'pat-before-backup');

    if (hasTemporary) {
      throw new Error('Restored database still contains the temporary patient that was added after backup!');
    }
    if (!hasOriginal) {
      throw new Error('Restored database lost original patient!');
    }

    console.log(`  ✅ PASSED: Backup verified and restored cleanly. Database rolled back to exact snapshot state.`);
    engine5.releaseProcessLock();
    passed++;
  } catch (err: any) {
    console.error(`  ❌ FAILED Test 5:`, err.message);
    failed++;
  }

  // --------------------------------------------------------------------------
  // TEST 6: Reset-Demo Protection Verification
  // --------------------------------------------------------------------------
  try {
    console.log('\nTEST 6: Testing reset-demo route security in server.ts...');
    // We check that reset-demo is strictly locked
    const serverFileContent = fs.readFileSync(path.resolve(process.cwd(), 'server.ts'), 'utf-8');
    if (!serverFileContent.includes('RESET_DEMO_DISABLED') || !serverFileContent.includes('403')) {
      throw new Error('server.ts does not hard-disable /api/reset-demo with 403 Forbidden!');
    }
    console.log('  ✅ PASSED: /api/reset-demo is hard-locked with 403 Forbidden.');
    passed++;
  } catch (err: any) {
    console.error(`  ❌ FAILED Test 6:`, err.message);
    failed++;
  }

  // --------------------------------------------------------------------------
  // Cleanup
  // --------------------------------------------------------------------------
  cleanupTestSandbox(false);

  console.log('\n================================================================');
  console.log(`🏁 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllPhase1Tests().catch(err => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
