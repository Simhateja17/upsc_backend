import fs from "node:fs/promises";
import path from "node:path";
import prisma from "../src/config/database";
import { ingestTopperPdf } from "./ingest-topper-pdf";

const PAPER_GROUPS = ["Essay", "GS Paper 1", "GS Paper 2", "GS Paper 3", "GS Paper 4"];

type ProgressState = {
  paperGroup?: string;
  pdfPath?: string;
  index?: number;
  total?: number;
  processed: number;
  skipped: number;
  failed: number;
};

const progress: ProgressState = {
  processed: 0,
  skipped: 0,
  failed: 0,
};

function log(stage: string, message: string, meta?: Record<string, unknown>) {
  const suffix = meta ? ` ${JSON.stringify(meta)}` : "";
  console.log(`[topper-folder:${stage}] ${new Date().toISOString()} ${message}${suffix}`);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? `${error.message}\n${error.stack || ""}` : String(error);
}

function memorySnapshot() {
  const memory = process.memoryUsage();
  return {
    rssMb: Math.round(memory.rss / 1024 / 1024),
    heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
    heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
    externalMb: Math.round(memory.external / 1024 / 1024),
  };
}

function progressSnapshot() {
  return {
    ...progress,
    memory: memorySnapshot(),
  };
}

function installProcessDiagnostics() {
  const heartbeat = setInterval(() => {
    log("heartbeat", "Ingestion process is alive", progressSnapshot());
  }, Number(process.env.TOPPER_HEARTBEAT_MS || 60000));
  heartbeat.unref();

  process.on("beforeExit", (code) => {
    log("before-exit", "Node event loop is empty", { code, ...progressSnapshot() });
  });

  process.on("exit", (code) => {
    console.error(
      `[topper-folder:process-exit] ${new Date().toISOString()} code=${code} progress=${JSON.stringify(
        progressSnapshot()
      )}`
    );
  });

  process.on("SIGINT", () => {
    console.error(
      `[topper-folder:signal] ${new Date().toISOString()} signal=SIGINT progress=${JSON.stringify(progressSnapshot())}`
    );
    process.exit(130);
  });

  process.on("SIGTERM", () => {
    console.error(
      `[topper-folder:signal] ${new Date().toISOString()} signal=SIGTERM progress=${JSON.stringify(progressSnapshot())}`
    );
    process.exit(143);
  });

  process.on("uncaughtException", (error) => {
    console.error(`[topper-folder:uncaught-exception] ${new Date().toISOString()} ${errorMessage(error)}`);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    console.error(`[topper-folder:unhandled-rejection] ${new Date().toISOString()} ${errorMessage(reason)}`);
    process.exit(1);
  });
}

function usage(): never {
  console.error(
    "Usage: npx tsx scripts/ingest-topper-folder.ts <folder-path> [max-pdfs] [max-pages-per-pdf]\n" +
      'Example: npx tsx scripts/ingest-topper-folder.ts "../Mains Answer Writing - Teja" 1 5'
  );
  process.exit(1);
}

async function collectPdfs(root: string, paperGroup: string): Promise<string[]> {
  const base = path.join(root, paperGroup);
  const entries = await fs.readdir(base, { withFileTypes: true }).catch(() => []);
  const pdfs: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(base, entry.name);
    if (entry.isDirectory()) {
      const nested = await fs.readdir(fullPath, { withFileTypes: true });
      pdfs.push(
        ...nested
          .filter((item) => item.isFile() && item.name.toLowerCase().endsWith(".pdf"))
          .map((item) => path.join(fullPath, item.name))
      );
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
      pdfs.push(fullPath);
    }
  }

  return pdfs.sort();
}

async function main() {
  installProcessDiagnostics();

  const [, , folderArg, maxPdfsRaw, maxPagesRaw] = process.argv;
  if (!folderArg) usage();

  const root = path.resolve(folderArg);
  const rootStat = await fs.stat(root).catch(() => null);
  if (!rootStat?.isDirectory()) {
    throw new Error(`Topper folder not found: ${root}`);
  }

  const maxPdfs = maxPdfsRaw ? Number(maxPdfsRaw) : Infinity;
  const maxPages = maxPagesRaw ? Number(maxPagesRaw) : undefined;
  let processed = 0;
  let skipped = 0;
  let failed = 0;
  let discovered = 0;

  log("start", "Starting topper folder ingestion", {
    root,
    maxPdfs: Number.isFinite(maxPdfs) ? maxPdfs : null,
    maxPages: maxPages ?? null,
  });

  for (const paperGroup of PAPER_GROUPS) {
    const pdfs = await collectPdfs(root, paperGroup);
    discovered += pdfs.length;
    log("paper", `Discovered PDFs for ${paperGroup}`, { count: pdfs.length });

    for (const [index, pdfPath] of pdfs.entries()) {
      if (processed >= maxPdfs) break;
      try {
        progress.paperGroup = paperGroup;
        progress.pdfPath = pdfPath;
        progress.index = index + 1;
        progress.total = pdfs.length;
        progress.processed = processed;
        progress.skipped = skipped;
        progress.failed = failed;
        log("pdf", `Processing ${path.basename(pdfPath)}`, {
          paperGroup,
          index: index + 1,
          total: pdfs.length,
          processed,
          skipped,
          failed,
        });
        const result = await ingestTopperPdf({ pdfPath, paperGroup, maxPages, skipExisting: true });
        if (result.skipped) {
          skipped += 1;
        } else {
          processed += 1;
        }
        progress.processed = processed;
        progress.skipped = skipped;
        progress.failed = failed;
        log("pdf-done", `Finished ${path.basename(pdfPath)}`, {
          paperGroup,
          result,
          processed,
          skipped,
          failed,
        });
      } catch (error) {
        failed += 1;
        progress.failed = failed;
        console.error(
          `[topper-folder:pdf-failed] ${new Date().toISOString()} failed ${pdfPath}:`,
          error instanceof Error ? error.message : error
        );
      }
    }
    if (processed >= maxPdfs) break;
  }

  if (discovered === 0) {
    throw new Error(
      `No PDFs found under ${root}. Expected subfolders: ${PAPER_GROUPS.join(", ")}`
    );
  }

  log("done", "Topper folder ingestion complete", { discovered, processed, skipped, failed });
  console.log(JSON.stringify({ discovered, processed, skipped, failed }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
