import fs from "node:fs/promises";
import path from "node:path";
import prisma from "../src/config/database";
import { ingestTopperPdf } from "./ingest-topper-pdf";

const PAPER_GROUPS = ["Essay", "GS Paper 1", "GS Paper 2", "GS Paper 3", "GS Paper 4"];

function log(stage: string, message: string, meta?: Record<string, unknown>) {
  const suffix = meta ? ` ${JSON.stringify(meta)}` : "";
  console.log(`[topper-folder:${stage}] ${new Date().toISOString()} ${message}${suffix}`);
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
        log("pdf-done", `Finished ${path.basename(pdfPath)}`, {
          paperGroup,
          result,
          processed,
          skipped,
          failed,
        });
      } catch (error) {
        failed += 1;
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
