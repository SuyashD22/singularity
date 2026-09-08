 
 
import { Router } from 'express';
import multer from 'multer';
import { getParticipants, importParticipants, getParticipantDetail, getStaff, clearEventData } from '../controllers/participants.js';
import { reportParticipant, bulkReportStaff } from '../controllers/checkin.js';
import { getCounters, createCounter, toggleCounter, counterEvents } from '../controllers/counters.js';
import { executeClaim } from '../controllers/claims.js';
import { getClaimsReport } from '../controllers/claimsReport.js';
import { syncBatchScans } from '../controllers/sync.js';
import { registerAdmin, loginAdmin, getMe, listAdmins, updateAdminPassword, deleteAdmin } from '../controllers/admin.js';
import { getCountdownState, countdownEvents, updateCountdownDisplay, triggerCountdownStart, removeCountdown, resetCountdown, syncCountdown } from '../controllers/countdown.js';
import { requireAnyAuth, requireAdminAuth, requireSuperAdmin } from '../middlewares/auth.js';

const router = Router();
const upload = multer(); // Store file in memory buffer for parser processing

// Start time for status uptime check
const startTime = new Date();

/**
 * Health / Uptime check
 */
router.get('/status', (req, res) => {
  const uptime = (Date.now() - startTime.getTime()) / 1000;
  res.json({
    status: 'healthy',
    version: '1.2.0',
    uptime,
    timestamp: new Date().toISOString()
  });
});

// ─── Participant Routes ───────────────────────────────────────────────────────
// Admin + Superadmin only (volunteers have no reason to manage the roster)
router.get('/participants', requireAnyAuth, getParticipants);
router.post('/participants/import', requireAdminAuth, upload.single('file'), importParticipants);
router.get('/staff', requireAnyAuth, getStaff);

// Superadmin only — destructive action
router.post('/participants/clear', requireSuperAdmin, clearEventData);

// Any authenticated user — volunteer needs to look up a participant to grant a QR pass
router.get('/participants/:id', requireAnyAuth, getParticipantDetail);
// Any authenticated user — triggers checkin email and generates pass
router.post('/participants/:id/report', requireAnyAuth, reportParticipant);

// Admin + Superadmin — bulk trigger for staff only
router.post('/checkin/bulk-staff', requireAdminAuth, bulkReportStaff);

// ─── Counter Routes ───────────────────────────────────────────────────────────
// Public read — scanner polls these before authentication state is loaded
router.get('/counters', getCounters);
router.get('/counters/events', counterEvents); // SSE stream for real-time scanner updates

// Admin + Superadmin only — volunteers cannot open/close counters
router.post('/counters', requireAdminAuth, createCounter);
router.post('/counters/:sessionId/toggle', requireAdminAuth, toggleCounter);

// ─── Countdown Routes ────────────────────────────────────────────────────────
// Public read & real-time SSE stream
router.get('/countdown', getCountdownState);
router.get('/countdown/events', countdownEvents);
router.post('/countdown/sync', syncCountdown);

// Admin + Superadmin controls
router.post('/countdown/display', requireAdminAuth, updateCountdownDisplay);
router.post('/countdown/start', requireAdminAuth, triggerCountdownStart);
router.post('/countdown/remove', requireAdminAuth, removeCountdown);
router.post('/countdown/reset', requireAdminAuth, resetCountdown);

// ─── Claim Routes ─────────────────────────────────────────────────────────────
// Any authenticated user — volunteers scan and submit claims
router.post('/claims', requireAnyAuth, executeClaim);

// Admin + Superadmin only — volunteers don't need the full report
router.get('/claims/report', requireAnyAuth, getClaimsReport);

// ─── Offline Replay Sync Route ────────────────────────────────────────────────
router.post('/scan/batch', requireAnyAuth, syncBatchScans);

// ─── Admin Authentication Routes ─────────────────────────────────────────────
// Public — login needed before any token exists
router.post('/admin/login', loginAdmin);

// Any authenticated user — used by the frontend to get their own profile
router.get('/admin/me', requireAnyAuth, getMe);

// Admin + Superadmin — can list admin accounts
router.get('/admin', requireAdminAuth, listAdmins);

// Superadmin only — create and delete accounts
router.post('/admin/register', requireSuperAdmin, registerAdmin);
router.delete('/admin/:id', requireSuperAdmin, deleteAdmin);

// Any authenticated user — enforces own-password-only rule inside the controller
router.put('/admin/:id/password', requireAnyAuth, updateAdminPassword);

export default router;
