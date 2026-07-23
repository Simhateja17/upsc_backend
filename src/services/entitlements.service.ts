import prisma from "../config/database";

export type PlanTier = "free" | "aspire" | "rise" | "ascent";
export type FeatureKey =
  | "jeet_ai_message"
  | "mains_evaluation"
  | "prelims_mock_attempt"
  | "forum_post"
  | "forum_reply"
  | "study_material_download"
  | "syllabus_tracker_items";

type LimitPeriod = "day" | "hour" | "lifetime" | "total" | "unlimited";

export type FeatureLimit = {
  period: LimitPeriod;
  limit: number | null;
};

export type EntitlementPolicy = {
  tier: PlanTier;
  limits: Partial<Record<FeatureKey, FeatureLimit>>;
  access: Record<string, string>;
  preview: Record<string, number | null>;
};

type UsageWindow = {
  used: number;
  limit: number | null;
  remaining: number | null;
  period: LimitPeriod;
  resetAt: string | null;
};

type FeatureStatus = UsageWindow & {
  allowed: boolean;
  featureKey: FeatureKey;
  tier?: PlanTier;
  code?: "FEATURE_LIMIT_REACHED" | "FEATURE_THROTTLED";
  message?: string;
  upgrade?: {
    recommendedTier: PlanTier;
    message: string;
  };
  throttle?: UsageWindow;
};

const TIER_RANK: Record<PlanTier, number> = {
  free: 0,
  aspire: 1,
  rise: 2,
  ascent: 3,
};

const ADMIN_PLAN_SIMULATION_REASON = "admin_plan_simulation";

const FREE_POLICY: EntitlementPolicy = {
  tier: "free",
  limits: {
    jeet_ai_message: { period: "day", limit: 2 },
    mains_evaluation: { period: "lifetime", limit: 3 },
    prelims_mock_attempt: { period: "lifetime", limit: 1 },
    syllabus_tracker_items: { period: "total", limit: 5 },
  },
  access: {
    analytics: "none",
    test_analytics: "none",
    revision_suite: "limited",
    flashcards: "limited",
    mindmaps: "limited",
    spaced_repetition: "limited",
    syllabus_tracker: "limited",
    // Study Groups are available to every signed-in learner, including free users.
    live_study_room: "full",
    mental_health_buddy: "none",
    mentorship: "none",
  },
  preview: {
    flashcard_subjects: 2,
    mindmaps: 2,
    spaced_repetition_questions: 5,
  },
};

const DEFAULT_POLICIES: Record<PlanTier, EntitlementPolicy> = {
  free: FREE_POLICY,
  aspire: {
    tier: "aspire",
    limits: {
      jeet_ai_message: { period: "day", limit: 10 },
      mains_evaluation: { period: "day", limit: 5 },
      prelims_mock_attempt: { period: "day", limit: 5 },
      syllabus_tracker_items: { period: "unlimited", limit: null },
    },
    access: {
      analytics: "limited",
      test_analytics: "limited",
      revision_suite: "limited",
      flashcards: "limited",
      mindmaps: "limited",
      spaced_repetition: "limited",
      syllabus_tracker: "full",
      live_study_room: "none",
      mental_health_buddy: "full",
      mentorship: "none",
    },
    preview: {
      flashcard_subjects: 2,
      mindmaps: 2,
      spaced_repetition_questions: 5,
    },
  },
  rise: {
    tier: "rise",
    limits: {
      jeet_ai_message: { period: "day", limit: 100 },
      mains_evaluation: { period: "day", limit: 25 },
      prelims_mock_attempt: { period: "day", limit: 50 },
      syllabus_tracker_items: { period: "unlimited", limit: null },
    },
    access: {
      analytics: "full",
      test_analytics: "full",
      revision_suite: "full",
      flashcards: "full",
      mindmaps: "full",
      spaced_repetition: "full",
      syllabus_tracker: "full",
      live_study_room: "full",
      mental_health_buddy: "full",
      mentorship: "none",
    },
    preview: {
      flashcard_subjects: null,
      mindmaps: null,
      spaced_repetition_questions: null,
    },
  },
  ascent: {
    tier: "ascent",
    limits: {
      jeet_ai_message: { period: "unlimited", limit: null },
      mains_evaluation: { period: "unlimited", limit: null },
      prelims_mock_attempt: { period: "unlimited", limit: null },
      syllabus_tracker_items: { period: "unlimited", limit: null },
    },
    access: {
      analytics: "full",
      test_analytics: "full",
      revision_suite: "full",
      flashcards: "full",
      mindmaps: "full",
      spaced_repetition: "full",
      syllabus_tracker: "full",
      live_study_room: "full",
      mental_health_buddy: "full",
      mentorship: "full",
    },
    preview: {
      flashcard_subjects: null,
      mindmaps: null,
      spaced_repetition_questions: null,
    },
  },
};

const THROTTLES: Partial<Record<PlanTier, Partial<Record<FeatureKey, FeatureLimit>>>> = {
  free: {
    jeet_ai_message: { period: "hour", limit: 2 },
  },
  aspire: {
    jeet_ai_message: { period: "hour", limit: 5 },
    mains_evaluation: { period: "hour", limit: 3 },
    prelims_mock_attempt: { period: "hour", limit: 3 },
  },
  rise: {
    jeet_ai_message: { period: "hour", limit: 25 },
    mains_evaluation: { period: "hour", limit: 7 },
    prelims_mock_attempt: { period: "hour", limit: 5 },
  },
  ascent: {
    jeet_ai_message: { period: "hour", limit: 50 },
    mains_evaluation: { period: "hour", limit: 10 },
    prelims_mock_attempt: { period: "hour", limit: 15 },
  },
};

const GLOBAL_THROTTLES: Partial<Record<FeatureKey, FeatureLimit[]>> = {
  forum_post: [
    { period: "hour", limit: 10 },
    { period: "day", limit: 50 },
  ],
  forum_reply: [
    { period: "hour", limit: 30 },
    { period: "day", limit: 150 },
  ],
  study_material_download: [
    { period: "hour", limit: 20 },
  ],
};

const STUDY_DOWNLOAD_DAILY_LIMIT: Record<PlanTier, number> = {
  free: 20,
  aspire: 20,
  rise: 100,
  ascent: 100,
};

export function normalizePlanTier(input?: string | null, name?: string | null): PlanTier {
  const raw = `${name || ""} ${input || ""}`.toLowerCase();
  if (raw.includes("ascent") || raw.includes("premium")) return "ascent";
  if (raw.includes("aspire") || raw.includes("foundation")) return "aspire";
  if (raw.includes("rise") || raw.includes("standard")) return "rise";
  if (input === "free" || input === "aspire" || input === "rise" || input === "ascent") return input;
  return "rise";
}

function mergePolicy(tier: PlanTier, entitlements: unknown): EntitlementPolicy {
  const base = DEFAULT_POLICIES[tier];
  if (!entitlements || typeof entitlements !== "object" || Array.isArray(entitlements)) return base;
  const custom = entitlements as Partial<EntitlementPolicy>;
  return {
    tier,
    limits: { ...base.limits, ...(custom.limits || {}) },
    access: { ...base.access, ...(custom.access || {}) },
    preview: { ...base.preview, ...(custom.preview || {}) },
  };
}

function istDayWindow(now = new Date()) {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const startIst = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST_OFFSET_MS;
  const endIst = startIst + 24 * 60 * 60 * 1000;
  return {
    start: new Date(startIst),
    end: new Date(endIst),
    resetAt: new Date(endIst).toISOString(),
  };
}

function getWindow(limit: FeatureLimit) {
  const now = new Date();
  if (limit.period === "day") {
    return istDayWindow(now);
  }
  if (limit.period === "hour") {
    return {
      start: new Date(now.getTime() - 60 * 60 * 1000),
      end: now,
      resetAt: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
    };
  }
  return { start: null, end: null, resetAt: null };
}

async function sumUsage(userId: string, featureKey: FeatureKey, limit: FeatureLimit) {
  if (limit.period === "unlimited") return 0;
  const window = getWindow(limit);
  const createdAt =
    window.start && window.end
      ? { gte: window.start, lt: window.end }
      : undefined;
  const result = await prisma.usageEvent.aggregate({
    where: {
      userId,
      featureKey,
      status: "success",
      ...(createdAt ? { createdAt } : {}),
    },
    _sum: { quantity: true },
  });
  return result._sum.quantity || 0;
}

function quotaStatus(featureKey: FeatureKey, limit: FeatureLimit, used: number, allowed: boolean): FeatureStatus {
  const window = getWindow(limit);
  const remaining = limit.limit === null ? null : Math.max(0, limit.limit - used);
  return {
    featureKey,
    allowed,
    used,
    limit: limit.limit,
    remaining,
    period: limit.period,
    resetAt: window.resetAt,
  };
}

function nextTierFor(featureKey: FeatureKey, tier: PlanTier): PlanTier {
  if (tier === "free") return featureKey === "jeet_ai_message" ? "aspire" : "aspire";
  if (tier === "aspire") return "rise";
  if (tier === "rise") return "ascent";
  return "ascent";
}

function upgradeMessage(featureKey: FeatureKey, tier: PlanTier, limit: FeatureLimit) {
  const nextTier = nextTierFor(featureKey, tier);
  const readable = featureKey.replace(/_/g, " ");
  return `You have used your ${limit.limit} ${limit.period} ${readable} limit. Upgrade to ${nextTier[0].toUpperCase()}${nextTier.slice(1)} for higher access.`;
}

async function activeOverride(userId: string) {
  const now = new Date();
  return prisma.userEntitlementOverride.findFirst({
    where: {
      userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getEffectiveEntitlements(userId: string) {
  const now = new Date();
  const [subscriptions, override, user] = await Promise.all([
    prisma.subscription.findMany({
      where: {
        userId,
        status: { in: ["active", "cancelled", "paused", "past_due", "halted"] },
      },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    }),
    activeOverride(userId),
    prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    }),
  ]);

  let tier: PlanTier = "free";
  let plan: (typeof subscriptions)[number]["plan"] | null = null;

  const eligibleSubscriptions = subscriptions.filter((subscription) => {
    if (["active", "cancelled", "paused"].includes(subscription.status)) {
      return subscription.endDate >= now;
    }
    if (["past_due", "halted"].includes(subscription.status)) {
      return Boolean(subscription.graceEndsAt && subscription.graceEndsAt >= now);
    }
    return false;
  });

  for (const subscription of eligibleSubscriptions) {
    const candidateTier = normalizePlanTier(subscription.plan.tier, subscription.plan.name);
    if (TIER_RANK[candidateTier] > TIER_RANK[tier]) {
      tier = candidateTier;
      plan = subscription.plan;
    }
  }

  if (override?.planTierOverride) {
    const overrideTier = normalizePlanTier(override.planTierOverride);
    const isAdminPlanSimulation = user?.role === "admin" && override.reason === ADMIN_PLAN_SIMULATION_REASON;
    if (isAdminPlanSimulation || TIER_RANK[overrideTier] >= TIER_RANK[tier]) {
      tier = overrideTier;
      plan = null;
    }
  }

  return {
    tier,
    plan,
    subscription: eligibleSubscriptions.find((s) => s.planId === plan?.id) || null,
    policy: plan ? mergePolicy(tier, plan.entitlements) : DEFAULT_POLICIES[tier],
    override,
  };
}

function bonusFor(override: Awaited<ReturnType<typeof activeOverride>>, featureKey: FeatureKey, period: LimitPeriod) {
  if (!override?.extraUsage || typeof override.extraUsage !== "object" || Array.isArray(override.extraUsage)) return 0;
  const extra = override.extraUsage as Record<string, unknown>;
  const keys = [
    `${featureKey}_${period}_bonus`,
    `${featureKey}_bonus`,
  ];
  return keys.reduce((sum, key) => {
    const value = extra[key];
    return sum + (typeof value === "number" && Number.isFinite(value) ? value : 0);
  }, 0);
}

export async function getFeatureStatus(userId: string, featureKey: FeatureKey): Promise<FeatureStatus> {
  const effective = await getEffectiveEntitlements(userId);
  const tier = effective.tier;
  let limit = effective.policy.limits[featureKey];

  if (featureKey === "study_material_download") {
    limit = { period: "day", limit: STUDY_DOWNLOAD_DAILY_LIMIT[tier] };
  }

  if (!limit) {
    return { ...quotaStatus(featureKey, { period: "unlimited", limit: null }, 0, true), tier };
  }

  const adjustedLimit = limit.limit === null
    ? limit
    : { ...limit, limit: limit.limit + bonusFor(effective.override, featureKey, limit.period) };
  const used = await sumUsage(userId, featureKey, adjustedLimit);
  const allowed = adjustedLimit.limit === null || used < adjustedLimit.limit;
  const status = quotaStatus(featureKey, adjustedLimit, used, allowed);
  status.tier = tier;

  if (!allowed) {
    return {
      ...status,
      code: "FEATURE_LIMIT_REACHED",
      message: upgradeMessage(featureKey, tier, adjustedLimit),
      upgrade: {
        recommendedTier: nextTierFor(featureKey, tier),
        message: upgradeMessage(featureKey, tier, adjustedLimit),
      },
    };
  }

  const throttleLimits = [
    ...(GLOBAL_THROTTLES[featureKey] || []),
    ...(THROTTLES[tier]?.[featureKey] ? [THROTTLES[tier]![featureKey]!] : []),
  ];

  for (const throttle of throttleLimits) {
    const throttleUsed = await sumUsage(userId, featureKey, throttle);
    if (throttle.limit !== null && throttleUsed >= throttle.limit) {
      return {
        ...status,
        allowed: false,
        code: "FEATURE_THROTTLED",
        message: featureKey === "jeet_ai_message" && tier === "free"
          ? "Jeet AI Mentor is handling heavy queries right now. Please try again later or upgrade for priority access."
          : "You are sending requests too quickly. Please try again after some time.",
        throttle: quotaStatus(featureKey, throttle, throttleUsed, false),
      };
    }
  }

  return status;
}

export async function recordUsageEvent(params: {
  userId: string;
  featureKey: FeatureKey;
  source?: string;
  quantity?: number;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}) {
  const quantity = params.quantity || 1;
  try {
    return await prisma.usageEvent.create({
      data: {
        userId: params.userId,
        featureKey: params.featureKey,
        source: params.source,
        quantity,
        idempotencyKey: params.idempotencyKey,
        metadata: params.metadata as any,
        status: "success",
      },
    });
  } catch (error: any) {
    if (error?.code === "P2002") return null;
    throw error;
  }
}

export async function getEntitlementSummary(userId: string) {
  const effective = await getEffectiveEntitlements(userId);
  const featureKeys: FeatureKey[] = [
    "jeet_ai_message",
    "mains_evaluation",
    "prelims_mock_attempt",
    "forum_post",
    "forum_reply",
    "study_material_download",
    "syllabus_tracker_items",
  ];
  const features: Record<string, FeatureStatus> = {};
  for (const featureKey of featureKeys) {
    features[featureKey] = await getFeatureStatus(userId, featureKey);
  }

  return {
    tier: effective.tier,
    plan: effective.plan
      ? {
          id: effective.plan.id,
          name: effective.plan.name,
          tier: normalizePlanTier(effective.plan.tier, effective.plan.name),
          billingCycle: effective.plan.billingCycle,
        }
      : null,
    subscription: effective.subscription
      ? {
          id: effective.subscription.id,
          status: effective.subscription.status,
          startDate: effective.subscription.startDate,
          endDate: effective.subscription.endDate,
          autoRenew: effective.subscription.autoRenew,
          razorpayStatus: effective.subscription.razorpayStatus,
          currentStart: effective.subscription.currentStart,
          currentEnd: effective.subscription.currentEnd,
          chargeAt: effective.subscription.chargeAt,
          graceEndsAt: effective.subscription.graceEndsAt,
          pausedAt: effective.subscription.pausedAt,
          cancelledAt: effective.subscription.cancelledAt,
        }
      : null,
    features,
    access: effective.policy.access,
    preview: effective.policy.preview,
    override: effective.override
      ? {
          id: effective.override.id,
          planTierOverride: effective.override.planTierOverride,
          reason: effective.override.reason,
          expiresAt: effective.override.expiresAt,
          isAdminPlanSimulation: effective.override.reason === ADMIN_PLAN_SIMULATION_REASON,
        }
      : null,
  };
}

export function defaultEntitlementsForTier(tier: PlanTier) {
  return DEFAULT_POLICIES[tier];
}
