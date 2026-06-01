import fs from "node:fs/promises";
import path from "node:path";
import prisma from "../src/config/database";
import { ingestTopperPdf } from "./ingest-topper-pdf";

const PAPER_GROUPS = ["Essay", "GS Paper 1", "GS Paper 2", "GS Paper 3", "GS Paper 4"];

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
  const maxPdfs = maxPdfsRaw ? Number(maxPdfsRaw) : Infinity;
  const maxPages = maxPagesRaw ? Number(maxPagesRaw) : undefined;
  let processed = 0;
  let failed = 0;

  for (const paperGroup of PAPER_GROUPS) {
    const pdfs = await collectPdfs(root, paperGroup);
    for (const pdfPath of pdfs) {
      if (processed >= maxPdfs) break;
      try {
        await ingestTopperPdf({ pdfPath, paperGroup, maxPages, skipExisting: true });
        processed += 1;
      } catch (error) {
        failed += 1;
        console.error(`[topper-folder] failed ${pdfPath}:`, error instanceof Error ? error.message : error);
      }
    }
    if (processed >= maxPdfs) break;
  }

  console.log(JSON.stringify({ processed, failed }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
