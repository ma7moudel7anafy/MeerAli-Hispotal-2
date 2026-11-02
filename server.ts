import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Note: Cloud Run and Nginx in this environment listen on port 8080 and forward
// traffic to port 3000. Cloud Run startup TCP probe also specifically probes port 3000.
// We must always bind the Node application server to port 3000.
const PORT = 3000;
const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'hospital_db.json');
const SEED_FILE = path.resolve(DATA_DIR, 'initial_seed.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface HospitalDatabase {
  specialties: any[];
  doctors: any[];
  schedules: any[];
  attendance: any[];
  patients: any[];
  visits: any[];
  diagnostics: any[];
  staff: any[];
  auditLogs: any[];
  lastUpdated: string;
}

function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function loadInitialDatabase(): HospitalDatabase {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.attendance)) {
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse existing DB file:', e);
    }
  }

  if (fs.existsSync(SEED_FILE)) {
    try {
      const content = fs.readFileSync(SEED_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.attendance)) {
        try {
          fs.writeFileSync(DB_FILE, content, 'utf-8');
        } catch {}
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse seed file:', e);
    }
  }

  return {
    specialties: [],
    doctors: [],
    schedules: [],
    attendance: [],
    patients: [],
    visits: [],
    diagnostics: [],
    staff: [],
    auditLogs: [],
    lastUpdated: new Date().toISOString(),
  };
}

let db = loadInitialDatabase();

function persistDb(): void {
  db.lastUpdated = new Date().toISOString();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist hospital database:', err);
  }
}

// Active Server-Sent Events (SSE) connections for live multi-device broadcasting
const sseClients = new Set<Response>();

function broadcast(eventType: string, payload: any) {
  const message = `data: ${JSON.stringify({ type: eventType, payload, timestamp: Date.now() })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Keep-alive heartbeat for SSE every 20 seconds
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(': heartbeat\n\n');
    } catch {
      sseClients.delete(client);
    }
  }
}, 20000);

async function startServer() {
  const app = express();
  app.use(express.json());

  // CORS support
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // =========================================================================
  // API Routes
  // =========================================================================

  // 1. Health & Server Status
  app.get('/api/status', (req: Request, res: Response) => {
    res.json({
      status: 'online',
      appName: 'مستشفى لجنة الزكاة بميت علي',
      connectedClients: sseClients.size,
      lastUpdated: db.lastUpdated,
      attendanceCount: db.attendance.length,
      visitsCount: db.visits.length,
    });
  });

  // 2. Full Sync Bundle
  app.get('/api/sync', (req: Request, res: Response) => {
    res.json({
      specialties: db.specialties,
      doctors: db.doctors,
      schedules: db.schedules,
      attendance: db.attendance,
      patients: db.patients,
      visits: db.visits,
      diagnostics: db.diagnostics,
      lastUpdated: db.lastUpdated,
    });
  });

  // 3. SSE Stream for Real-time multi-device synchronization
  app.get('/api/events', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // Send initial handshake
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // 4. Attendance Endpoints
  app.get('/api/attendance', (req: Request, res: Response) => {
    const date = (req.query.date as string) || getTodayDateString();
    const records = db.attendance.filter(a => a.attendance_date === date);
    res.json(records);
  });

  app.post('/api/attendance', (req: Request, res: Response) => {
    const {
      doctorId,
      attendanceDate,
      status,
      delayExpectedTime,
      internalNotes,
      updaterDisplayName,
    } = req.body;

    if (!doctorId || !attendanceDate || !status) {
      res.status(400).json({ error: 'Missing required attendance fields' });
      return;
    }

    const doc = db.doctors.find(d => d.id === doctorId);
    const existingIndex = db.attendance.findIndex(
      a => a.doctor_id === doctorId && a.attendance_date === attendanceDate
    );

    const now = new Date().toISOString();
    const existingRecord = existingIndex >= 0 ? db.attendance[existingIndex] : null;

    const finalNotes =
      internalNotes !== undefined
        ? (internalNotes || '')
        : (existingRecord?.internal_notes || '');

    const updatedRecord = {
      id: existingRecord ? existingRecord.id : `att-${Date.now()}`,
      doctor_id: doctorId,
      doctor_name: doc?.full_name || 'طبيب',
      doctor_title: doc?.title || '',
      specialty_name: doc?.specialty_name || '',
      attendance_date: attendanceDate,
      status,
      delay_expected_time:
        delayExpectedTime !== undefined
          ? delayExpectedTime
          : (existingRecord?.delay_expected_time || null),
      internal_notes: finalNotes,
      updated_by_name: updaterDisplayName || 'موظف الاستقبال',
      updated_at: now,
    };

    if (existingIndex >= 0) {
      db.attendance[existingIndex] = updatedRecord;
    } else {
      db.attendance.push(updatedRecord);
    }

    persistDb();

    // Broadcast live event to all devices immediately!
    broadcast('hospital-attendance-updated', {
      doctorId,
      attendanceDate,
      status,
      delayExpectedTime,
      updaterDisplayName,
      record: updatedRecord,
    });

    res.json({ success: true, data: updatedRecord });
  });

  // 5. Visits Endpoints
  app.get('/api/visits', (req: Request, res: Response) => {
    const { date, doctorId, patientId } = req.query;
    let list = db.visits;
    if (date) {
      list = list.filter(v => v.visit_date === date);
    }
    if (doctorId) {
      list = list.filter(v => v.doctor_id === doctorId);
    }
    if (patientId) {
      list = list.filter(v => v.patient_id === patientId);
    }
    res.json(list);
  });

  app.post('/api/visits', (req: Request, res: Response) => {
    const visitData = req.body;
    if (!visitData || !visitData.id) {
      res.status(400).json({ error: 'Invalid visit data' });
      return;
    }

    const existingIndex = db.visits.findIndex(v => v.id === visitData.id);
    if (existingIndex >= 0) {
      db.visits[existingIndex] = { ...db.visits[existingIndex], ...visitData };
    } else {
      db.visits.unshift(visitData);
    }

    persistDb();

    broadcast('hospital-visit-updated', {
      visitId: visitData.id,
      doctorId: visitData.doctor_id,
      status: visitData.status,
      patientName: visitData.patient_name,
      doctorName: visitData.doctor_name,
      visit: visitData,
    });

    res.json({ success: true, data: visitData });
  });

  // 6. Patients Endpoints
  app.get('/api/patients', (req: Request, res: Response) => {
    res.json(db.patients);
  });

  app.post('/api/patients', (req: Request, res: Response) => {
    const patientData = req.body;
    if (!patientData || !patientData.id) {
      res.status(400).json({ error: 'Invalid patient data' });
      return;
    }

    const existingIndex = db.patients.findIndex(p => p.id === patientData.id);
    if (existingIndex >= 0) {
      db.patients[existingIndex] = { ...db.patients[existingIndex], ...patientData };
      // Keep patient name and phone synced across visits
      if (patientData.full_name || patientData.phone) {
        db.visits.forEach(v => {
          if (v.patient_id === patientData.id) {
            if (patientData.full_name) v.patient_name = patientData.full_name;
            if (patientData.phone) v.patient_phone = patientData.phone;
          }
        });
      }
    } else {
      db.patients.unshift(patientData);
    }

    persistDb();
    broadcast('hospital-patient-updated', { patient: patientData });
    res.json({ success: true, data: patientData });
  });

  // 7. Reset to Initial Seed
  app.post('/api/reset-demo', (req: Request, res: Response) => {
    if (fs.existsSync(SEED_FILE)) {
      try {
        db = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
      } catch (e) {
        console.error('Reset error:', e);
      }
    }
    persistDb();
    broadcast('hospital-refresh-all', {});
    res.json({ success: true, message: 'Database reset to initial demo state' });
  });

  // =========================================================================
  // Vite Integration (Dev) or Static Serves (Prod)
  // =========================================================================
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);

    // Fallback to transform and serve index.html
    app.use('*', async (req: Request, res: Response, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Mit Ali Hospital Server] Running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start hospital server:', err);
  process.exit(1);
});
