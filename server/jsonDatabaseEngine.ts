import fs from 'fs';
import path from 'path';
import os from 'os';

export interface HospitalDatabase {
  specialties: any[];
  doctors: any[];
  schedules: any[];
  attendance: any[];
  patients: any[];
  visits: any[];
  diagnostics: any[];
  diagnostic_orders?: any[];
  staff: any[];
  auditLogs: any[];
  shift_opening_floats?: Record<string, any>;
  clinical_presets?: Record<string, any>;
  doctor_favorite_protocols?: any[];
  counters?: {
    patient_sequence?: number;
    receipt_sequence?: number;
    diagnostic_order_sequence?: number;
  };
  lastUpdated: string;
}

export interface BackupMetadata {
  filename: string;
  filepath: string;
  sizeBytes: number;
  createdAt: string;
  reason: string;
  recordCounts?: {
    patients: number;
    visits: number;
    attendance: number;
    doctors: number;
  };
}

export interface EngineOptions {
  dataDir?: string;
  dbFilename?: string;
  seedFilename?: string;
  autoBackupIntervalMs?: number; // default 60 minutes
}

export class JsonDatabaseEngine {
  private dataDir: string;
  private dbFile: string;
  private tmpFile: string;
  private seedFile: string;
  private backupsDir: string;
  private corruptedDir: string;
  private lockFile: string;
  private lockFd: number | null = null;
  private hasAcquiredLock = false;

  private inMemoryDb!: HospitalDatabase;
  private isRecoveryMode = false;
  private recoveryReason: string | null = null;
  private isWritesFrozen = false;
  private backupTimer: NodeJS.Timeout | null = null;
  private autoBackupIntervalMs: number;

  // Cached latest backup metadata to avoid reading all backup files from disk on every /api/status request
  private latestBackupSummary: {
    filename: string | null;
    createdAt: string | null;
    status: 'success' | 'failed' | 'none';
    error: string | null;
  } = {
    filename: null,
    createdAt: null,
    status: 'none',
    error: null,
  };

  // Single centralized Write Queue / Mutex
  private writeQueue: Promise<any> = Promise.resolve();

  constructor(options: EngineOptions = {}) {
    const envDataDir = process.env.HOSPITAL_DATA_DIR;
    this.dataDir = options.dataDir || (envDataDir ? path.resolve(envDataDir) : path.resolve(process.cwd(), 'data'));
    this.dbFile = path.resolve(this.dataDir, options.dbFilename || 'hospital_db.json');
    this.tmpFile = path.resolve(this.dataDir, `${options.dbFilename || 'hospital_db.json'}.tmp`);
    this.seedFile = path.resolve(this.dataDir, options.seedFilename || 'initial_seed.json');
    this.backupsDir = path.resolve(this.dataDir, 'backups');
    this.corruptedDir = path.resolve(this.dataDir, 'corrupted');
    this.lockFile = path.resolve(this.dataDir, `${options.dbFilename || 'hospital_db.json'}.lock`);
    this.autoBackupIntervalMs = options.autoBackupIntervalMs ?? (60 * 60 * 1000); // 60 min

    this.ensureDirectories();
  }

  public getDataDir(): string {
    return this.dataDir;
  }

  public getDbFilePath(): string {
    return this.dbFile;
  }

  private ensureDirectories(): void {
    for (const dir of [this.dataDir, this.backupsDir, this.corruptedDir]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Acquire single-instance process lock to prevent concurrent server instances from running on same data.
   */
  private static activeLocksInProcess = new Set<string>();

  public acquireProcessLock(): void {
    this.ensureDirectories();
    try {
      // 'wx' flag fails if lock file already exists
      this.lockFd = fs.openSync(this.lockFile, 'wx');
      const pidInfo = JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() });
      fs.writeSync(this.lockFd, pidInfo, 0, 'utf-8');
      fs.fsyncSync(this.lockFd);
      this.hasAcquiredLock = true;
      JsonDatabaseEngine.activeLocksInProcess.add(this.lockFile);
    } catch (err: any) {
      if (err.code === 'EEXIST') {
        // Lock file exists - check if process is still alive or file is invalid/empty/stale
        let isStale = false;
        let staleReason = '';
        let activePid: number | null = null;

        try {
          const lockRaw = fs.readFileSync(this.lockFile, 'utf-8').trim();
          if (!lockRaw) {
            isStale = true;
            staleReason = 'Lock file is empty (0 bytes)';
          } else {
            const parsed = JSON.parse(lockRaw);
            if (!parsed.pid || typeof parsed.pid !== 'number') {
              isStale = true;
              staleReason = 'Lock file does not contain a valid PID';
            } else if (parsed.pid === process.pid) {
              // Condition (a): PID in lock file equals current process.pid
              if (JsonDatabaseEngine.activeLocksInProcess.has(this.lockFile)) {
                // Another active instance in the current running process owns this lock
                activePid = parsed.pid;
              } else {
                // No active instance in current process holds it -> leftover from previous run
                isStale = true;
                staleReason = `Lock PID (${parsed.pid}) matches current process PID, but no active instance holds it (stale leftover session)`;
              }
            } else {
              // Condition (b): startedAt in lock is older than system boot time
              const systemBootTimeMs = Date.now() - (os.uptime() * 1000);
              const lockStartTimeMs = parsed.startedAt ? new Date(parsed.startedAt).getTime() : NaN;

              if (!isNaN(lockStartTimeMs) && lockStartTimeMs < systemBootTimeMs) {
                isStale = true;
                staleReason = `Lock startedAt (${parsed.startedAt}) is older than system boot time (${new Date(systemBootTimeMs).toISOString()})`;
              } else {
                try {
                  process.kill(parsed.pid, 0);
                  activePid = parsed.pid;
                } catch (killErr: any) {
                  if (killErr.code === 'ESRCH') {
                    isStale = true;
                    staleReason = `Dead PID ${parsed.pid} (process no longer exists)`;
                  } else {
                    throw killErr;
                  }
                }
              }
            }
          }
        } catch (readParseErr: any) {
          if (readParseErr.name === 'SyntaxError') {
            isStale = true;
            staleReason = `Corrupted JSON content in lock file (${readParseErr.message})`;
          } else {
            throw readParseErr;
          }
        }

        if (isStale) {
          console.warn(`[JsonDatabaseEngine] Removing stale or corrupted lock file (${this.lockFile}): ${staleReason}`);
          try {
            fs.unlinkSync(this.lockFile);
          } catch {}
          try {
            this.lockFd = fs.openSync(this.lockFile, 'wx');
            const newPidInfo = JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() });
            fs.writeSync(this.lockFd, newPidInfo, 0, 'utf-8');
            fs.fsyncSync(this.lockFd);
            this.hasAcquiredLock = true;
            JsonDatabaseEngine.activeLocksInProcess.add(this.lockFile);
            return;
          } catch (retryErr: any) {
            throw new Error(`Failed to re-acquire instance lock after removing stale lock: ${retryErr.message}`);
          }
        }

        if (activePid !== null) {
          throw new Error(
            `Another hospital server instance is currently running (PID: ${activePid}) on data directory ${this.dataDir}. Cannot start a second instance. ` +
            `[Operator Guide]: If another instance is running, stop it first. If the previous process crashed or was terminated and PID was reused, verify with 'ps aux | grep node'. If no hospital server is running, delete the lock file '${this.lockFile}' and restart.`
          );
        }
      }
      throw new Error(`Failed to acquire instance lock on ${this.lockFile}: ${err.message}`);
    }
  }

  public releaseProcessLock(): void {
    if (!this.hasAcquiredLock) {
      if (this.lockFd !== null) {
        try {
          fs.closeSync(this.lockFd);
        } catch {}
        this.lockFd = null;
      }
      return;
    }

    if (this.lockFd !== null) {
      try {
        fs.closeSync(this.lockFd);
      } catch {}
      this.lockFd = null;
    }

    if (fs.existsSync(this.lockFile)) {
      try {
        const raw = fs.readFileSync(this.lockFile, 'utf-8').trim();
        const parsed = JSON.parse(raw);
        if (parsed.pid === process.pid) {
          fs.unlinkSync(this.lockFile);
        }
      } catch {
        try {
          fs.unlinkSync(this.lockFile);
        } catch {}
      }
    }
    this.hasAcquiredLock = false;
    JsonDatabaseEngine.activeLocksInProcess.delete(this.lockFile);
  }

  /**
   * Initializes the engine, acquires process lock, tests JSON validity,
   * guards missing file if backups exist, quarantines if corrupted, and takes startup snapshot.
   */
  public async init(): Promise<void> {
    this.acquireProcessLock();
    this.ensureDirectories();
    this.cleanupOrphanedTmpFile();

    const backupsExist = this.hasExistingBackups();

    if (fs.existsSync(this.dbFile)) {
      try {
        const raw = fs.readFileSync(this.dbFile, 'utf-8');
        const parsed = JSON.parse(raw);

        if (this.validateDatabaseStructure(parsed)) {
          this.inMemoryDb = parsed;
          this.isRecoveryMode = false;
          this.isWritesFrozen = false;
          this.recoveryReason = null;
          console.log(`[JsonDatabaseEngine] Database successfully loaded (${this.inMemoryDb.patients.length} patients, ${this.inMemoryDb.visits.length} visits).`);
        } else {
          throw new Error('Database schema structure is missing required collections (attendance, patients, or visits).');
        }
      } catch (err: any) {
        console.error(`[JsonDatabaseEngine CRITICAL] Failed to parse ${this.dbFile}: ${err.message}`);
        this.enterRecoveryMode(`JSON corruption or invalid structure: ${err.message}`);
      }
    } else {
      // Database file is missing!
      if (backupsExist) {
        // RULE 3: If hospital_db.json is missing but backups exist in backups/, enter Recovery Mode. DO NOT use initial_seed!
        console.error(`[JsonDatabaseEngine CRITICAL] ${this.dbFile} is missing, but backups were found in backups/. Entering Recovery Mode.`);
        this.enterRecoveryMode(`Database file is missing while backups exist in backups directory. Restore required.`);
      } else {
        // Clean first true run: No database file and NO backups exist anywhere. Initialize from seed.
        if (fs.existsSync(this.seedFile)) {
          try {
            const rawSeed = fs.readFileSync(this.seedFile, 'utf-8');
            const parsedSeed = JSON.parse(rawSeed);
            this.inMemoryDb = parsedSeed;
            await this.atomicWriteToDisk(this.inMemoryDb);
            console.log(`[JsonDatabaseEngine] First true startup: Initialized database from seed file.`);
          } catch (e: any) {
            console.error(`[JsonDatabaseEngine] Seed file unreadable, starting empty:`, e.message);
            this.inMemoryDb = this.createEmptyDatabase();
            await this.atomicWriteToDisk(this.inMemoryDb);
          }
        } else {
          this.inMemoryDb = this.createEmptyDatabase();
          await this.atomicWriteToDisk(this.inMemoryDb);
        }
      }
    }

    // RULE 4: Always take an initial backup on startup if database is healthy
    if (!this.isRecoveryMode && this.inMemoryDb) {
      this.createBackup('startup');
    }

    // Start auto backup scheduler if not in recovery mode
    if (!this.isRecoveryMode && this.autoBackupIntervalMs > 0) {
      this.startAutoBackup();
    }
  }

  private getDbBaseName(): string {
    return path.basename(this.dbFile, path.extname(this.dbFile));
  }

  private hasExistingBackups(): boolean {
    if (!fs.existsSync(this.backupsDir)) return false;
    try {
      const prefix = `${this.getDbBaseName()}_`;
      const files = fs.readdirSync(this.backupsDir).filter(f => f.startsWith(prefix) && f.endsWith('.json'));
      return files.length > 0;
    } catch {
      return false;
    }
  }

  private cleanupOrphanedTmpFile(): void {
    if (fs.existsSync(this.tmpFile)) {
      try {
        fs.unlinkSync(this.tmpFile);
        console.log(`[JsonDatabaseEngine] Cleaned up orphaned temporary file: ${this.tmpFile}`);
      } catch (e: any) {
        console.warn(`[JsonDatabaseEngine] Could not remove old tmp file: ${e.message}`);
      }
    }
  }

  private validateDatabaseStructure(obj: any): obj is HospitalDatabase {
    if (!obj || typeof obj !== 'object') return false;
    return (
      Array.isArray(obj.attendance) &&
      Array.isArray(obj.patients) &&
      Array.isArray(obj.visits) &&
      Array.isArray(obj.doctors) &&
      Array.isArray(obj.specialties)
    );
  }

  private createEmptyDatabase(): HospitalDatabase {
    return {
      specialties: [],
      doctors: [],
      schedules: [],
      attendance: [],
      patients: [],
      visits: [],
      diagnostics: [],
      diagnostic_orders: [],
      staff: [],
      auditLogs: [],
      shift_opening_floats: {},
      clinical_presets: {},
      doctor_favorite_protocols: [],
      counters: {
        patient_sequence: 1000,
        receipt_sequence: 100,
        diagnostic_order_sequence: 50,
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Quarantines corrupted file to data/corrupted/ and enters strict Recovery Mode.
   * STRICT: NEVER overwrites with initial_seed.json.
   */
  private enterRecoveryMode(reason: string): void {
    this.isRecoveryMode = true;
    this.isWritesFrozen = true;
    this.recoveryReason = reason;

    if (fs.existsSync(this.dbFile)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const quarantinedPath = path.resolve(this.corruptedDir, `hospital_db_corrupted_${timestamp}.json`);
      try {
        fs.copyFileSync(this.dbFile, quarantinedPath);
        console.warn(`[JsonDatabaseEngine RECOVERY] Corrupted file quarantined to: ${quarantinedPath}`);
      } catch (err: any) {
        console.error(`[JsonDatabaseEngine] Failed to quarantine corrupted file: ${err.message}`);
      }
    }

    // Determine latest backup candidate from backups directory
    let latestBackupCandidate: string | null = null;
    try {
      if (fs.existsSync(this.backupsDir)) {
        const prefix = `${this.getDbBaseName()}_`;
        const backupFiles = fs.readdirSync(this.backupsDir)
          .filter(f => f.startsWith(prefix) && f.endsWith('.json'))
          .map(f => ({ name: f, time: fs.statSync(path.resolve(this.backupsDir, f)).mtimeMs }))
          .sort((a, b) => b.time - a.time);
        if (backupFiles.length > 0) {
          latestBackupCandidate = backupFiles[0].name;
        }
      }
    } catch {}

    console.error(`\n****************************************************************`);
    console.error(`🚨 [JsonDatabaseEngine RECOVERY MODE ACTIVATED] 🚨`);
    console.error(`السبب (Reason): ${reason}`);
    console.error(`حالة الكتابة: مجمدة تماماً لحماية البيانات من التلف (Writes Frozen: 503)`);
    if (latestBackupCandidate) {
      console.error(`أحدث نسخة احتياطية متاحة (Latest Backup Candidate): ${latestBackupCandidate}`);
      console.error(`خطوات الاستعادة اليدوية السريعة:`);
      console.error(`  1. أوقف الخادم (Ctrl+C أو kill).`);
      console.error(`  2. نفّذ أمر النسخ: cp "${path.resolve(this.backupsDir, latestBackupCandidate)}" "${this.dbFile}"`);
      console.error(`  3. أعد تشغيل الخادم.`);
    } else {
      console.error(`النسخ الاحتياطية: لا توجد أي نسخ احتياطية سابقة في مجلد backups/.`);
      console.error(`خطوات الفحص: افحص الملف المعزول في مجلد corrupted/ أو استرجع النسخة الاحتياطية الخارجية.`);
    }
    console.error(`****************************************************************\n`);

    // Set fallback read-only memory instance to prevent total server crash
    this.inMemoryDb = this.createEmptyDatabase();
  }

  /**
   * Single Centralized Write Queue (Mutex)
   * Ensures serialized execution. Primary memory instance is ONLY modified after disk write succeeds!
   */
  public enqueueWrite<T>(
    mutator: (draft: HospitalDatabase) => { result: T; validationError?: string } | Promise<{ result: T; validationError?: string }>
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.writeQueue = this.writeQueue
        .then(async () => {
          if (this.isWritesFrozen || this.isRecoveryMode) {
            const err = new Error(`Writes are frozen: System is in Recovery Mode (${this.recoveryReason || 'Corrupted Database'})`);
            (err as any).statusCode = 503;
            throw err;
          }

          // 1. Create candidate staging draft (Deep Clone)
          const candidateDraft: HospitalDatabase = JSON.parse(JSON.stringify(this.inMemoryDb));

          // 2. Execute mutation on candidate draft
          const mutationOutput = await mutator(candidateDraft);
          if (mutationOutput.validationError) {
            const err = new Error(`Validation Error: ${mutationOutput.validationError}`);
            (err as any).statusCode = 400;
            throw err;
          }

          candidateDraft.lastUpdated = new Date().toISOString();

          // 3. Perform atomic disk write with fsync
          await this.atomicWriteToDisk(candidateDraft);

          // 4. CRITICAL INTEGRITY RULE: Commit to primary in-memory instance ONLY after disk write succeeds
          this.inMemoryDb = candidateDraft;

          resolve(mutationOutput.result);
        })
        .catch(err => {
          // Failure leaves this.inMemoryDb completely unchanged
          reject(err);
        });
    });
  }

  /**
   * Physical Atomic Disk Write Pipeline:
   * 1. Write to .tmp file
   * 2. fs.fsyncSync on file descriptor (Mandatory)
   * 3. Close file descriptor
   * 4. Atomic fs.renameSync
   * 5. fs.fsyncSync on parent directory (wrapped in try/catch for OS compatibility)
   */
  private async atomicWriteToDisk(data: HospitalDatabase): Promise<void> {
    const serialized = JSON.stringify(data, null, 2);
    let fileFd: number | null = null;

    try {
      // 1 & 2: Open and write to .tmp
      fileFd = fs.openSync(this.tmpFile, 'w');
      fs.writeSync(fileFd, serialized, 0, 'utf-8');

      // Mandatory fsync on file descriptor to flush OS buffers to physical media
      fs.fsyncSync(fileFd);
      fs.closeSync(fileFd);
      fileFd = null;

      // 4. Atomic Rename
      fs.renameSync(this.tmpFile, this.dbFile);

      // 5. Parent Directory fsync (wrapped in try/catch)
      try {
        const dirFd = fs.openSync(this.dataDir, 'r');
        fs.fsyncSync(dirFd);
        fs.closeSync(dirFd);
      } catch (dirFsyncErr: any) {
        // OS warning (e.g. EISDIR/EPERM on some Windows/virtual filesystems), non-fatal
        console.warn(`[JsonDatabaseEngine] Directory fsync warning (non-fatal): ${dirFsyncErr.message}`);
      }
    } catch (writeErr: any) {
      if (fileFd !== null) {
        try { fs.closeSync(fileFd); } catch {}
      }
      // Clean up failed .tmp file if present
      if (fs.existsSync(this.tmpFile)) {
        try { fs.unlinkSync(this.tmpFile); } catch {}
      }
      throw writeErr;
    }
  }

  /**
   * Rolling Automated Backup Service
   * Retains at least the last 48 backups AND all backups <= 7 days old.
   */
  public createBackup(reason = 'scheduled'): { success: boolean; backupPath?: string; error?: string } {
    try {
      this.ensureDirectories();
      if (!this.inMemoryDb) {
        this.latestBackupSummary = {
          filename: null,
          createdAt: new Date().toISOString(),
          status: 'failed',
          error: 'Database instance not initialized',
        };
        return { success: false, error: 'Database instance not initialized' };
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = `${this.getDbBaseName()}_${timestamp}_${reason}.json`;
      const backupPath = path.resolve(this.backupsDir, backupFilename);

      const serialized = JSON.stringify(this.inMemoryDb, null, 2);

      // Atomic write for backup
      const tmpBackup = `${backupPath}.tmp`;
      const fd = fs.openSync(tmpBackup, 'w');
      fs.writeSync(fd, serialized, 0, 'utf-8');
      fs.fsyncSync(fd);
      fs.closeSync(fd);
      fs.renameSync(tmpBackup, backupPath);

      // Verify backup integrity
      const verifyRaw = fs.readFileSync(backupPath, 'utf-8');
      const parsed = JSON.parse(verifyRaw);
      if (!this.validateDatabaseStructure(parsed)) {
        throw new Error('Created backup failed schema verification check');
      }

      // Update cached latest backup summary (O(1) memory lookup)
      this.latestBackupSummary = {
        filename: backupFilename,
        createdAt: new Date().toISOString(),
        status: 'success',
        error: null,
      };

      // Enforce Dual Retention Policy (48 backups + <= 7 days)
      this.pruneBackups();

      return { success: true, backupPath };
    } catch (err: any) {
      this.latestBackupSummary = {
        filename: null,
        createdAt: new Date().toISOString(),
        status: 'failed',
        error: err.message,
      };
      console.error(`[JsonDatabaseEngine CRITICAL_ALERT] Backup creation failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  private pruneBackups(): void {
    try {
      const prefix = `${this.getDbBaseName()}_`;
      const files = fs.readdirSync(this.backupsDir)
        .filter(f => f.startsWith(prefix) && f.endsWith('.json'))
        .map(f => {
          const filepath = path.resolve(this.backupsDir, f);
          const stat = fs.statSync(filepath);
          return { filename: f, filepath, mtimeMs: stat.mtimeMs };
        })
        .sort((a, b) => b.mtimeMs - a.mtimeMs); // newest first

      const MIN_RETAIN_COUNT = 48;
      const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
      const now = Date.now();

      if (files.length <= MIN_RETAIN_COUNT) {
        return; // Always keep at least 48
      }

      // Check files beyond the first 48
      for (let i = MIN_RETAIN_COUNT; i < files.length; i++) {
        const item = files[i];
        const ageMs = now - item.mtimeMs;
        if (ageMs > MAX_AGE_MS) {
          try {
            fs.unlinkSync(item.filepath);
          } catch {}
        }
      }
    } catch (err: any) {
      console.warn(`[JsonDatabaseEngine] Pruning backups warning: ${err.message}`);
    }
  }

  private startAutoBackup(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
    }
    this.backupTimer = setInterval(() => {
      this.createBackup('auto-hourly');
    }, this.autoBackupIntervalMs);
  }

  public stopAutoBackup(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = null;
    }
  }

  // =========================================================================
  // Public Accessors & Operational Methods
  // =========================================================================

  public getDbSnapshot(): HospitalDatabase {
    return JSON.parse(JSON.stringify(this.inMemoryDb));
  }

  public isRecovery(): boolean {
    return this.isRecoveryMode;
  }

  public getRecoveryReason(): string | null {
    return this.recoveryReason;
  }

  public getLatestBackupSummary() {
    return this.latestBackupSummary;
  }

  public getRecoveryStatus() {
    return {
      isRecoveryMode: this.isRecoveryMode,
      recoveryReason: this.recoveryReason,
      isWritesFrozen: this.isWritesFrozen,
      latestBackup: this.latestBackupSummary,
      availableBackupsCount: this.getBackupFilesCount(),
    };
  }

  private getBackupFilesCount(): number {
    try {
      const prefix = `${this.getDbBaseName()}_`;
      return fs.readdirSync(this.backupsDir).filter(f => f.startsWith(prefix) && f.endsWith('.json')).length;
    } catch {
      return 0;
    }
  }

  /**
   * Lightweight backup listing for admin inspection (only stats, does NOT read full JSON payloads)
   */
  public listBackups(): BackupMetadata[] {
    try {
      this.ensureDirectories();
      const prefix = `${this.getDbBaseName()}_`;
      return fs.readdirSync(this.backupsDir)
        .filter(f => f.startsWith(prefix) && f.endsWith('.json'))
        .map(f => {
          const filepath = path.resolve(this.backupsDir, f);
          const stat = fs.statSync(filepath);
          return {
            filename: f,
            filepath,
            sizeBytes: stat.size,
            createdAt: new Date(stat.mtimeMs).toISOString(),
            reason: f.includes('hourly') ? 'hourly' : f.includes('startup') ? 'startup' : 'manual',
          };
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch {
      return [];
    }
  }

  /**
   * Restores database from a selected backup after taking a safety snapshot.
   * RULE 6: Passes through the centralized write queue to ensure serialization.
   */
  public restoreFromBackup(backupFilename: string): Promise<{ success: boolean; error?: string }> {
    return new Promise<{ success: boolean; error?: string }>((resolve, reject) => {
      this.writeQueue = this.writeQueue
        .then(async () => {
          const backupPath = path.resolve(this.backupsDir, backupFilename);
          if (!fs.existsSync(backupPath)) {
            return resolve({ success: false, error: 'Backup file does not exist' });
          }

          const raw = fs.readFileSync(backupPath, 'utf-8');
          const parsed = JSON.parse(raw);
          if (!this.validateDatabaseStructure(parsed)) {
            return resolve({ success: false, error: 'Selected backup failed structure verification' });
          }

          // Safety snapshot of current state before restore
          if (this.inMemoryDb && !this.isRecoveryMode) {
            this.createBackup('pre-restore-safety');
          }

          await this.atomicWriteToDisk(parsed);
          this.inMemoryDb = parsed;
          this.isRecoveryMode = false;
          this.isWritesFrozen = false;
          this.recoveryReason = null;

          resolve({ success: true });
        })
        .catch(err => {
          resolve({ success: false, error: err.message });
        });
    });
  }

  // =========================================================================
  // Entity Operations (Attendance, Visits, Patients)
  // =========================================================================

  public getAttendance(date?: string): any[] {
    const list = this.inMemoryDb?.attendance || [];
    if (!date) return list;
    return list.filter(a => a.attendance_date === date);
  }

  public async saveAttendance(input: {
    doctorId: string;
    attendanceDate: string;
    status: string;
    delayExpectedTime?: string | null;
    internalNotes?: string;
    updaterDisplayName?: string;
  }): Promise<any> {
    return this.enqueueWrite(draft => {
      const { doctorId, attendanceDate, status, delayExpectedTime, internalNotes, updaterDisplayName } = input;

      if (!doctorId || !attendanceDate || !status) {
        return { result: null, validationError: 'Missing required attendance fields (doctorId, attendanceDate, status)' };
      }

      const doc = draft.doctors.find(d => d.id === doctorId);
      if (!doc && draft.doctors.length > 0) {
        return { result: null, validationError: `Doctor not found: ${doctorId}` };
      }
      const existingIndex = draft.attendance.findIndex(
        a => a.doctor_id === doctorId && a.attendance_date === attendanceDate
      );

      const existingRecord = existingIndex >= 0 ? draft.attendance[existingIndex] : null;
      const finalNotes = internalNotes !== undefined ? (internalNotes || '') : (existingRecord?.internal_notes || '');

      const updatedRecord = {
        id: existingRecord ? existingRecord.id : `att-${Date.now()}`,
        doctor_id: doctorId,
        doctor_name: doc?.full_name || 'طبيب',
        doctor_title: doc?.title || '',
        specialty_name: doc?.specialty_name || '',
        attendance_date: attendanceDate,
        status,
        delay_expected_time: delayExpectedTime !== undefined ? delayExpectedTime : (existingRecord?.delay_expected_time || null),
        internal_notes: finalNotes,
        updated_by_name: updaterDisplayName || 'موظف الاستقبال',
        updated_at: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        draft.attendance[existingIndex] = updatedRecord;
      } else {
        draft.attendance.push(updatedRecord);
      }

      return { result: updatedRecord };
    });
  }

  public getVisits(filter?: { date?: string; doctorId?: string; patientId?: string }): any[] {
    let list = this.inMemoryDb?.visits || [];
    if (filter?.date) list = list.filter(v => v.visit_date === filter.date);
    if (filter?.doctorId) list = list.filter(v => v.doctor_id === filter.doctorId);
    if (filter?.patientId) list = list.filter(v => v.patient_id === filter.patientId);
    return list;
  }

  public async saveVisit(visitData: any): Promise<any> {
    return this.enqueueWrite(draft => {
      if (!visitData || !visitData.id) {
        return { result: null, validationError: 'Invalid visit data: id is required' };
      }

      // Foreign key / relation validation: verify patient and doctor exist
      if (visitData.patient_id && draft.patients.length > 0) {
        const patientExists = draft.patients.some(p => p.id === visitData.patient_id);
        if (!patientExists) {
          return { result: null, validationError: `Patient not found: ${visitData.patient_id}` };
        }
      }

      if (visitData.doctor_id && draft.doctors.length > 0) {
        const doctorExists = draft.doctors.some(d => d.id === visitData.doctor_id);
        if (!doctorExists) {
          return { result: null, validationError: `Doctor not found: ${visitData.doctor_id}` };
        }
      }

      const existingIndex = draft.visits.findIndex(v => v.id === visitData.id);
      if (existingIndex >= 0) {
        draft.visits[existingIndex] = { ...draft.visits[existingIndex], ...visitData };
      } else {
        draft.visits.unshift(visitData);
      }

      return { result: visitData };
    });
  }

  public getPatients(): any[] {
    return this.inMemoryDb?.patients || [];
  }

  public async savePatient(patientData: any): Promise<any> {
    return this.enqueueWrite(draft => {
      if (!patientData || !patientData.id) {
        return { result: null, validationError: 'Invalid patient data: id is required' };
      }

      const existingIndex = draft.patients.findIndex(p => p.id === patientData.id);
      if (existingIndex >= 0) {
        draft.patients[existingIndex] = { ...draft.patients[existingIndex], ...patientData };
        // Sync name and phone across existing visits
        if (patientData.full_name || patientData.phone) {
          draft.visits.forEach(v => {
            if (v.patient_id === patientData.id) {
              if (patientData.full_name) v.patient_name = patientData.full_name;
              if (patientData.phone) v.patient_phone = patientData.phone;
            }
          });
        }
      } else {
        draft.patients.unshift(patientData);
      }

      return { result: patientData };
    });
  }
}
