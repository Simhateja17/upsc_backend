import "dotenv/config";
import { getAchievements } from "./src/services/badges/badgeService";

const USER_ID = "f3bcd724-deeb-4000-8874-2390ffb69b85";

async function main() {
  console.log("=== First call (should award newly-earned badges) ===");
  const first = await getAchievements(USER_ID);
  console.log("earnedTotal:", first.earnedTotal, "/", first.totalBadges);
  console.log("heroStats:", first.heroStats);
  console.log("newlyAwarded:", first.newlyAwarded);
  console.log(
    "earned keys:",
    first.badges.filter((b) => b.status === "earned").map((b) => b.key),
  );
  console.log("totalsByCategory:", first.totalsByCategory);

  console.log("\n=== Second call (idempotent — newlyAwarded should be empty) ===");
  const second = await getAchievements(USER_ID);
  console.log("newlyAwarded:", second.newlyAwarded);
  console.log("earnedTotal:", second.earnedTotal);

  // Sanity: unsupported badges must never be earned.
  const unsupportedEarned = second.badges.filter((b) => !b.supported && b.status === "earned");
  console.log("\nunsupported-but-earned (must be empty):", unsupportedEarned.map((b) => b.key));

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
