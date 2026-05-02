import { Request, Response } from "express";
import prisma from "../../config/database";

/**
 * GET /api/admin/ai-cost
 *
 * Query params:
 *   from  — start date (YYYY-MM-DD), defaults to first day of current month
 *   to    — end date   (YYYY-MM-DD), defaults to today
 *
 * Returns aggregated AI usage + cost broken down by service and by day.
 */
export async function getAiCost(req: Request, res: Response): Promise<void> {
  try {
    // ── Date range ──────────────────────────────────────────────────────────
    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1); // 1st of month
    const defaultTo = new Date(now);
    defaultTo.setHours(23, 59, 59, 999); // end of today

    const from = req.query.from
      ? new Date(`${req.query.from}T00:00:00.000Z`)
      : defaultFrom;
    const to = req.query.to
      ? new Date(`${req.query.to}T23:59:59.999Z`)
      : defaultTo;

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      res.status(400).json({ status: "error", message: "Invalid date format. Use YYYY-MM-DD." });
      return;
    }

    // ── Raw logs in range ───────────────────────────────────────────────────
    const logs = await prisma.aiUsageLog.findMany({
      where: { createdAt: { gte: from, lte: to } },
      orderBy: { createdAt: "asc" },
    });

    // ── Totals ──────────────────────────────────────────────────────────────
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCostUsd = 0;
    let totalCostInr = 0;

    for (const log of logs) {
      totalInputTokens += log.inputTokens;
      totalOutputTokens += log.outputTokens;
      totalCostUsd += log.costUsd;
      totalCostInr += log.costInr;
    }

    // ── By service ──────────────────────────────────────────────────────────
    const serviceMap = new Map<
      string,
      { calls: number; inputTokens: number; outputTokens: number; costUsd: number; costInr: number }
    >();

    for (const log of logs) {
      const entry = serviceMap.get(log.service) ?? {
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        costInr: 0,
      };
      entry.calls += 1;
      entry.inputTokens += log.inputTokens;
      entry.outputTokens += log.outputTokens;
      entry.costUsd += log.costUsd;
      entry.costInr += log.costInr;
      serviceMap.set(log.service, entry);
    }

    const byService = Array.from(serviceMap.entries())
      .map(([service, data]) => ({ service, ...data }))
      .sort((a, b) => b.costUsd - a.costUsd); // most expensive first

    // ── By day ──────────────────────────────────────────────────────────────
    const dayMap = new Map<
      string,
      { calls: number; inputTokens: number; outputTokens: number; costUsd: number; costInr: number }
    >();

    for (const log of logs) {
      const date = log.createdAt.toISOString().slice(0, 10); // "YYYY-MM-DD"
      const entry = dayMap.get(date) ?? {
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        costInr: 0,
      };
      entry.calls += 1;
      entry.inputTokens += log.inputTokens;
      entry.outputTokens += log.outputTokens;
      entry.costUsd += log.costUsd;
      entry.costInr += log.costInr;
      dayMap.set(date, entry);
    }

    const daily = Array.from(dayMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ── Response ─────────────────────────────────────────────────────────────
    res.json({
      status: "success",
      data: {
        period: {
          from: from.toISOString().slice(0, 10),
          to: to.toISOString().slice(0, 10),
        },
        totals: {
          calls: logs.length,
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          totalTokens: totalInputTokens + totalOutputTokens,
          costUsd: parseFloat(totalCostUsd.toFixed(6)),
          costInr: parseFloat(totalCostInr.toFixed(4)),
        },
        byService,
        daily,
      },
    });
  } catch (error) {
    console.error("Error fetching AI cost data:", error);
    res.status(500).json({ status: "error", message: "Failed to fetch AI cost data" });
  }
}
