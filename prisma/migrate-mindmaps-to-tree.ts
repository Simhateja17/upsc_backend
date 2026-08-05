/**
 * Migration script: converts existing flat mindmap format to new nested tree format.
 *
 * Old format:
 *   branches: [{ name, count, color }]
 *   nodes: { center, branches: [{ x, y, label, color }] }
 *
 * New format (stored in `nodes` column as { root: ... }):
 *   nodes: {
 *     root: {
 *       label: "Parliament",
 *       children: [
 *         { label: "Lok Sabha" },
 *         { label: "Rajya Sabha" }
 *       ]
 *     },
 *     _legacyPositions: { ... }  // preserved for rollback
 *   }
 *
 * Run with: npx tsx prisma/migrate-mindmaps-to-tree.ts
 */

import "dotenv/config";
import { PrismaClient } from ".prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type OldBranch = { name: string; count: number; color: string };
type OldNodes = { center: string; branches: { x: string; y: string; label: string; color: string }[] };
type TreeNode = { label: string; children?: TreeNode[] };

async function main() {
  const mindmaps = await prisma.mindmap.findMany();
  console.log(`Found ${mindmaps.length} mindmaps to migrate.\n`);

  let migrated = 0;
  let skipped = 0;

  for (const map of mindmaps) {
    const nodes = map.nodes as any;

    // Skip if already in new format
    if (nodes && typeof nodes === 'object' && 'root' in nodes && nodes.root?.label) {
      console.log(`  SKIP (already migrated): ${map.title}`);
      skipped++;
      continue;
    }

    const branches = map.branches as OldBranch[] | null;
    const oldNodes = nodes as OldNodes | null;
    const centerLabel = oldNodes?.center || map.title;

    // Convert branches to tree children
    const children: TreeNode[] = (branches || []).map((b) => ({
      label: b.name,
    }));

    const newNodes = {
      root: {
        label: centerLabel,
        children,
      },
      // Preserve legacy data for rollback
      _legacyPositions: oldNodes,
    };

    await prisma.mindmap.update({
      where: { id: map.id },
      data: { nodes: newNodes as any },
    });

    console.log(`  MIGRATED: ${map.title} (${children.length} branches → children)`);
    migrated++;
  }

  console.log(`\nDone! Migrated: ${migrated}, Skipped: ${skipped}, Total: ${mindmaps.length}`);
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
