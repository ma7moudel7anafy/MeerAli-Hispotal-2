import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { JsonDatabaseEngine } from './server/jsonDatabaseEngine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Port and Host binding: Default to 127.0.0.1:3000, configurable via PORT env var
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = '127.0.0.1';

// Instantiate Central Storage Engine (respects HOSPITAL_DATA_DIR env var)
const engine = new JsonDatabaseEngine();

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

function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Global cleanup handlers to release lockfile on shutdown
process.on('SIGINT', () => {
  engine.releaseProcessLock();
  process.exit(0);
});
process.on('SIGTERM', () => {
  engine.releaseProcessLock();
  process.exit(0);
});
process.on('exit', () => {
  engine.releaseProcessLock();
});

async function startServer() {
  // Initialize storage engine: verifies process lock, JSON integrity, backups, or enters recovery mode
  await engine.init();

  const app = express();
  app.use(express.json());

  // Note: Access-Control-Allow-Origin: * has been removed because the React frontend
  // is served from the same server origin.

  // Middleware to guard operational endpoints when in Recovery Mode (503 Service Unavailable)
  app.use((req: Request, res: Response, next) => {
    if (engine.isRecovery()) {
      // Allow inspection routes and static assets even in Recovery Mode
      if (req.path.startsWith('/api/recovery') || req.path === '/api/status' || !req.path.startsWith('/api/')) {
        return next();
      }
      return res.status(503).json({
        error: 'SERVICE_UNAVAILABLE_RECOVERY_MODE',
        message: 'النظام في وضع الاسترداد الآمن (Recovery Mode) بسبب تلف أو فقدان ملف البيانات. تم تجميد كافة عمليات الحفظ لحين الاستعادة.',
        recoveryReason: engine.getRecoveryReason(),
      });
    }
    next();
  });

  // =========================================================================
  // API Routes (Pass-through via JsonDatabaseEngine)
  // =========================================================================

  // 1. Health & Server Status
  app.get('/api/status', (req: Request, res: Response) => {
    const db = engine.getDbSnapshot();
    const recovery = engine.getRecoveryStatus();
    res.json({
      status: recovery.isRecoveryMode ? 'recovery_mode' : 'online',
      appName: 'مستشفى لجنة الزكاة بميت علي',
      connectedClients: sseClients.size,
      lastUpdated: db.lastUpdated,
      attendanceCount: db.attendance?.length || 0,
      visitsCount: db.visits?.length || 0,
      patientsCount: db.patients?.length || 0,
      recovery,
    });
  });

  // 2. Recovery Status Inspection
  app.get('/api/recovery/status', (req: Request, res: Response) => {
    res.json(engine.getRecoveryStatus());
  });

  // 3. Full Sync Bundle
  app.get('/api/sync', (req: Request, res: Response) => {
    const db = engine.getDbSnapshot();
    res.json({
      specialties: db.specialties || [],
      doctors: db.doctors || [],
      schedules: db.schedules || [],
      attendance: db.attendance || [],
      patients: db.patients || [],
      visits: db.visits || [],
      diagnostics: db.diagnostics || [],
      lastUpdated: db.lastUpdated,
    });
  });

  // 4. SSE Stream for Real-time event broadcasting
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

  // 5. Attendance Endpoints
  app.get('/api/attendance', (req: Request, res: Response) => {
    const date = (req.query.date as string) || getTodayDateString();
    const records = engine.getAttendance(date);
    res.json(records);
  });

  app.post('/api/attendance', async (req: Request, res: Response) => {
    try {
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

      // 1. Save atomically through Write Queue & fsync
      const updatedRecord = await engine.saveAttendance({
        doctorId,
        attendanceDate,
        status,
        delayExpectedTime,
        internalNotes,
        updaterDisplayName,
      });

      // 2. Broadcast SSE event ONLY AFTER successful disk persistence
      broadcast('hospital-attendance-updated', {
        doctorId,
        attendanceDate,
        status,
        delayExpectedTime,
        updaterDisplayName,
        record: updatedRecord,
      });

      // 3. Send HTTP Success response
      res.json({ success: true, data: updatedRecord });
    } catch (err: any) {
      console.error('[API Attendance Error]', err.message);
      const statusCode = err.statusCode || (err.message && err.message.includes('Validation Error') ? 400 : 500);
      res.status(statusCode).json({ error: err.message || 'Failed to update attendance' });
    }
  });

  // 6. Visits Endpoints
  app.get('/api/visits', (req: Request, res: Response) => {
    const { date, doctorId, patientId } = req.query;
    const list = engine.getVisits({
      date: date as string,
      doctorId: doctorId as string,
      patientId: patientId as string,
    });
    res.json(list);
  });

  app.post('/api/visits', async (req: Request, res: Response) => {
    try {
      const visitData = req.body;
      if (!visitData || !visitData.id) {
        res.status(400).json({ error: 'Invalid visit data: id is required' });
        return;
      }

      // 1. Save atomically through Write Queue & fsync
      const savedVisit = await engine.saveVisit(visitData);

      // 2. Broadcast SSE event ONLY AFTER successful disk persistence
      broadcast('hospital-visit-updated', {
        visitId: visitData.id,
        doctorId: visitData.doctor_id,
        status: visitData.status,
        patientName: visitData.patient_name,
        doctorName: visitData.doctor_name,
        visit: savedVisit,
      });

      // 3. Send HTTP Success response
      res.json({ success: true, data: savedVisit });
    } catch (err: any) {
      console.error('[API Visit Error]', err.message);
      const statusCode = err.statusCode || (err.message && err.message.includes('Validation Error') ? 400 : 500);
      res.status(statusCode).json({ error: err.message || 'Failed to save visit' });
    }
  });

  // 7. Patients Endpoints
  app.get('/api/patients', (req: Request, res: Response) => {
    res.json(engine.getPatients());
  });

  app.post('/api/patients', async (req: Request, res: Response) => {
    try {
      const patientData = req.body;
      if (!patientData || !patientData.id) {
        res.status(400).json({ error: 'Invalid patient data: id is required' });
        return;
      }

      // 1. Save atomically through Write Queue & fsync
      const savedPatient = await engine.savePatient(patientData);

      // 2. Broadcast SSE event ONLY AFTER successful disk persistence
      broadcast('hospital-patient-updated', { patient: savedPatient });

      // 3. Send HTTP Success response
      res.json({ success: true, data: savedPatient });
    } catch (err: any) {
      console.error('[API Patient Error]', err.message);
      const statusCode = err.statusCode || (err.message && err.message.includes('Validation Error') ? 400 : 500);
      res.status(statusCode).json({ error: err.message || 'Failed to save patient' });
    }
  });

  // 8. Reset to Initial Seed (HARD-DISABLED in Phase 1)
  app.post('/api/reset-demo', (req: Request, res: Response) => {
    res.status(403).json({
      error: 'RESET_DEMO_DISABLED',
      message: 'عملية إعادة الضبط معطلة ومغلقة تمامًا في المرحلة الأولى لحين اكتمال وتفعيل نظام المصادقة والموافقة الإدارية الصريحة في المرحلة الثانية.',
    });
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

  app.listen(PORT, HOST, () => {
    console.log(`[Mit Ali Hospital Server] Running securely at http://${HOST}:${PORT}`);
    console.log(`[Mit Ali Hospital Server] Data Directory: ${engine.getDataDir()}`);
    console.log(`[Mit Ali Hospital Server] Database File: ${engine.getDbFilePath()}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start hospital server:', err.message);
  process.exit(1);
});
