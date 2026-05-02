import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase";

function getSubscriptionFromSettings(settings: any) {
  const s = settings || {};
  const sub = s.subscription || {};
  return {
    plan: sub.plan || "free",
    status: sub.status || "expired",
    trialEndsOn: sub.trialEndsOn || null,
    renewsOn: sub.renewsOn || null,
    amount: sub.amount || null,
  };
}

export const getSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("settings")
      .eq("id", req.user!.id)
      .single();

    const sub = getSubscriptionFromSettings(user?.settings);
    res.json({ status: "success", data: sub });
  } catch (error) {
    next(error);
  }
};

export const startTrial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("settings")
      .eq("id", req.user!.id)
      .single();

    const currentSettings = (existing?.settings as Record<string, any>) || {};
    const currentSub = currentSettings.subscription || {};

    // Prevent restarting an active trial
    if (currentSub.plan === "trial" && currentSub.trialEndsOn && new Date(currentSub.trialEndsOn) > new Date()) {
      return res.status(400).json({ status: "error", message: "Trial already active" });
    }

    const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const updatedSettings = {
      ...currentSettings,
      subscription: {
        plan: "trial",
        status: "trial",
        trialEndsOn: trialEnd,
        amount: "Free 7-day trial",
      },
    };

    const { error } = await supabaseAdmin
      .from("users")
      .update({ settings: updatedSettings })
      .eq("id", req.user!.id);

    if (error) {
      console.error("[Subscription] startTrial error:", error.message);
      return res.status(500).json({ status: "error", message: "Failed to start trial" });
    }

    res.json({
      status: "success",
      data: {
        plan: "trial",
        status: "trial",
        trialEndsOn: trialEnd,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const cancelSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("settings")
      .eq("id", req.user!.id)
      .single();

    const currentSettings = (existing?.settings as Record<string, any>) || {};
    const updatedSettings = {
      ...currentSettings,
      subscription: {
        plan: "free",
        status: "expired",
        trialEndsOn: null,
        renewsOn: null,
        amount: null,
      },
    };

    const { error } = await supabaseAdmin
      .from("users")
      .update({ settings: updatedSettings })
      .eq("id", req.user!.id);

    if (error) {
      console.error("[Subscription] cancelSubscription error:", error.message);
      return res.status(500).json({ status: "error", message: "Failed to cancel subscription" });
    }

    res.json({ status: "success", message: "Subscription cancelled" });
  } catch (error) {
    next(error);
  }
};

export const getOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("id, item_name, amount, status, payment_method, created_at")
      .eq("user_id", req.user!.id)
      .order("created_at", { ascending: false });

    res.json({ status: "success", data: orders || [] });
  } catch (error) {
    next(error);
  }
};
