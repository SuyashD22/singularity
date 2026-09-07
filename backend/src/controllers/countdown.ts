/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../services/db.js';
import { addCountdownClient, broadcastCountdownUpdate } from '../services/sse.js';

interface FormattedCountdownState {
  isDisplayed: boolean;
  isStarted: boolean;
  startedAt: string | null;
  updatedAt: string;
  serverTime: string;
}

function formatCountdownState(record: any): FormattedCountdownState {
  return {
    isDisplayed: Boolean(record?.isDisplayed ?? record?.is_displayed ?? false),
    isStarted: Boolean(record?.isStarted ?? record?.is_started ?? false),
    startedAt: record?.startedAt ? new Date(record.startedAt).toISOString() : (record?.started_at ? new Date(record.started_at).toISOString() : null),
    updatedAt: record?.updatedAt ? new Date(record.updatedAt).toISOString() : (record?.updated_at ? new Date(record.updated_at).toISOString() : new Date().toISOString()),
    serverTime: new Date().toISOString()
  };
}

async function getOrCreateState() {
  try {
    const existing = await (prisma as any).countdownState.findUnique({
      where: { id: 'default' }
    });
    if (existing) return existing;

    return await (prisma as any).countdownState.create({
      data: {
        id: 'default',
        isDisplayed: false,
        isStarted: false,
        startedAt: null
      }
    });
  } catch {
    // Fallback using raw queries if prisma model isn't generated yet
    const raw: any = await prisma.$queryRawUnsafe(`SELECT * FROM countdown_state WHERE id = 'default' LIMIT 1`);
    if (Array.isArray(raw) && raw.length > 0) {
      return raw[0];
    }
    await prisma.$executeRawUnsafe(`INSERT OR IGNORE INTO countdown_state (id, is_displayed, is_started) VALUES ('default', 0, 0)`);
    return { id: 'default', is_displayed: 0, is_started: 0, started_at: null, updated_at: new Date() };
  }
}

/**
 * GET /api/countdown
 * Public endpoint returning current countdown state.
 */
export async function getCountdownState(req: Request, res: Response, next: NextFunction) {
  try {
    const state = await getOrCreateState();
    res.json(formatCountdownState(state));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/countdown/display
 * Admin endpoint: Enables display of the countdown on the public site (in idle state).
 */
export async function updateCountdownDisplay(req: Request, res: Response, next: NextFunction) {
  try {
    let updated: any;
    try {
      updated = await (prisma as any).countdownState.upsert({
        where: { id: 'default' },
        update: {
          isDisplayed: true,
          isStarted: false,
          startedAt: null
        },
        create: {
          id: 'default',
          isDisplayed: true,
          isStarted: false,
          startedAt: null
        }
      });
    } catch {
      await prisma.$executeRawUnsafe(`
        UPDATE countdown_state
        SET is_displayed = 1, is_started = 0, started_at = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = 'default'
      `);
      updated = await getOrCreateState();
    }

    const formatted = formatCountdownState(updated);
    broadcastCountdownUpdate(formatted);
    res.json({ success: true, message: "Countdown display enabled", state: formatted });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/countdown/start
 * Admin endpoint: Starts the live countdown animation.
 * Requires display to be enabled first.
 */
export async function triggerCountdownStart(req: Request, res: Response, next: NextFunction) {
  try {
    const current = await getOrCreateState();
    const isDisp = Boolean(current?.isDisplayed ?? current?.is_displayed);

    if (!isDisp) {
      res.status(400).json({ detail: "Cannot start countdown: Display must be enabled first." });
      return;
    }

    const now = new Date();
    let updated: any;
    try {
      updated = await (prisma as any).countdownState.update({
        where: { id: 'default' },
        data: {
          isStarted: true,
          startedAt: now
        }
      });
    } catch {
      await prisma.$executeRawUnsafe(`
        UPDATE countdown_state
        SET is_started = 1, started_at = '${now.toISOString()}', updated_at = CURRENT_TIMESTAMP
        WHERE id = 'default'
      `);
      updated = await getOrCreateState();
    }

    const formatted = formatCountdownState(updated);
    broadcastCountdownUpdate(formatted);
    res.json({ success: true, message: "Countdown started", state: formatted });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/countdown/remove
 * Admin endpoint: Removes/hides the countdown animation completely from public frontend.
 */
export async function removeCountdown(req: Request, res: Response, next: NextFunction) {
  try {
    let updated: any;
    try {
      updated = await (prisma as any).countdownState.upsert({
        where: { id: 'default' },
        update: {
          isDisplayed: false,
          isStarted: false,
          startedAt: null
        },
        create: {
          id: 'default',
          isDisplayed: false,
          isStarted: false,
          startedAt: null
        }
      });
    } catch {
      await prisma.$executeRawUnsafe(`
        UPDATE countdown_state
        SET is_displayed = 0, is_started = 0, started_at = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = 'default'
      `);
      updated = await getOrCreateState();
    }

    const formatted = formatCountdownState(updated);
    broadcastCountdownUpdate(formatted);
    res.json({ success: true, message: "Countdown removed from frontend", state: formatted });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/countdown/reset
 * Admin endpoint: Resets countdown to idle state (isStarted: false).
 */
export async function resetCountdown(req: Request, res: Response, next: NextFunction) {
  try {
    let updated: any;
    try {
      updated = await (prisma as any).countdownState.update({
        where: { id: 'default' },
        data: {
          isStarted: false,
          startedAt: null
        }
      });
    } catch {
      await prisma.$executeRawUnsafe(`
        UPDATE countdown_state
        SET is_started = 0, started_at = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = 'default'
      `);
      updated = await getOrCreateState();
    }

    const formatted = formatCountdownState(updated);
    broadcastCountdownUpdate(formatted);
    res.json({ success: true, message: "Countdown reset to idle", state: formatted });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/countdown/events
 * Real-time SSE stream pushing countdown changes immediately to connected clients.
 */
export async function countdownEvents(req: Request, res: Response) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  try {
    const current = await getOrCreateState();
    res.write(`data: ${JSON.stringify(formatCountdownState(current))}\n\n`);
  } catch (err) {
    console.error("Error sending initial countdown SSE:", err);
  }

  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 30000);

  addCountdownClient(res);

  req.on('close', () => {
    clearInterval(heartbeat);
  });
}
