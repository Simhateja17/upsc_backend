import "dotenv/config";
import prisma from "../src/config/database";
import {
  BillingCycle,
  createRazorpayPlan,
  fetchRazorpayPlan,
} from "../src/services/razorpaySubscription.service";
import {
  isRazorpayPlanCompatible,
  planAmountPaise,
  validateCanonicalPaidPlanCatalog,
} from "../src/services/razorpayPlanSync.service";

function normalizeCycle(value: string): BillingCycle {
  if (value === "monthly" || value === "quarterly" || value === "yearly") return value;
  throw new Error(`Unsupported billing cycle: ${value}`);
}

async function main() {
  const plans = await prisma.pricingPlan.findMany({
    where: {
      isActive: true,
      tier: { in: ["aspire", "rise", "ascent"] },
      billingCycle: { in: ["monthly", "quarterly", "yearly"] },
    },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

  console.log(`[Razorpay Plan Sync] Found ${plans.length} active paid SKUs`);

  const catalog = validateCanonicalPaidPlanCatalog(plans);
  if (catalog.missing.length > 0 || catalog.duplicates.length > 0 || catalog.mismatched.length > 0) {
    const missing = catalog.missing.length > 0 ? ` Missing: ${catalog.missing.join(", ")}.` : "";
    const duplicates = catalog.duplicates.length > 0 ? ` Duplicates: ${catalog.duplicates.join(", ")}.` : "";
    const mismatched = catalog.mismatched.length > 0
      ? ` Mismatched prices: ${catalog.mismatched.map(({ key, actual, expected }) => `${key}=${actual}, expected ${expected}`).join("; ")}.`
      : "";
    throw new Error(`Canonical paid pricing catalog is not applied. Run the pricing migration first.${missing}${duplicates}${mismatched}`);
  }

  for (const plan of plans) {
    const cycle = normalizeCycle(plan.billingCycle);
    if (plan.razorpayPlanId) {
      try {
        const remote = await fetchRazorpayPlan(plan.razorpayPlanId);
        if (!isRazorpayPlanCompatible(remote, plan.price, cycle)) {
          console.warn(`[replace] ${plan.name}: stored Razorpay plan does not match ${plan.price} INR ${cycle}; creating a corrected plan`);
        } else {
          await prisma.pricingPlan.update({
            where: { id: plan.id },
            data: { razorpayPlanVerifiedAt: new Date() },
          });
          console.log(`[skip] ${plan.name}: verified ${remote.id}`);
          continue;
        }
      } catch (error: any) {
        console.warn(`[warn] ${plan.name}: stored Razorpay plan ${plan.razorpayPlanId} was not verified (${error?.message || "unknown error"})`);
      }
    }

    const remote = await createRazorpayPlan({
      name: plan.name,
      amountPaise: planAmountPaise(plan.price),
      cycle,
      notes: {
        pricingPlanId: plan.id,
        tier: plan.tier,
        billingCycle: plan.billingCycle,
      },
    });

    await prisma.pricingPlan.update({
      where: { id: plan.id },
      data: {
        razorpayPlanId: remote.id,
        razorpayPlanVerifiedAt: new Date(),
      },
    });
    console.log(`[create] ${plan.name}: ${remote.id}`);
  }
}

main()
  .catch((error) => {
    console.error("[Razorpay Plan Sync] Failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
