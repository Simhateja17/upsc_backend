import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase";

/**
 * GET /api/user/profile
 */
export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id, email, first_name, last_name, phone, avatar_url, bio, settings, created_at")
      .eq("id", req.user!.id)
      .single();

    if (!user) return res.status(404).json({ status: "error", message: "User not found" });

    const settings = (user.settings as Record<string, any>) || {};
    const profileExtra = settings.profile || {};

    res.json({
      status: "success",
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        settings: user.settings || {},
        createdAt: user.created_at,
        state: profileExtra.state || "",
        targetYear: profileExtra.targetYear || "",
        optionalSubject: profileExtra.optionalSubject || "",
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/user/profile
 */
export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, phone, bio, state, targetYear, optionalSubject } = req.body;

    const updates: Record<string, any> = {};
    if (firstName !== undefined) updates.first_name = firstName;
    if (lastName !== undefined) updates.last_name = lastName;
    if (phone !== undefined) updates.phone = phone;
    if (bio !== undefined) updates.bio = bio;

    // Merge profile extras into settings JSON
    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("settings")
      .eq("id", req.user!.id)
      .single();

    const currentSettings = (existing?.settings as Record<string, any>) || {};
    const profileExtra: Record<string, any> = { ...currentSettings.profile };
    if (state !== undefined) profileExtra.state = state;
    if (targetYear !== undefined) profileExtra.targetYear = targetYear;
    if (optionalSubject !== undefined) profileExtra.optionalSubject = optionalSubject;

    const hasProfileExtra = Object.keys(profileExtra).length > 0;
    if (hasProfileExtra) {
      updates.settings = { ...currentSettings, profile: profileExtra };
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ status: "error", message: "No fields to update" });
    }

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .update(updates)
      .eq("id", req.user!.id)
      .select("id, email, first_name, last_name, phone, avatar_url, bio, settings")
      .single();

    if (error) {
      console.error("[User] updateProfile error:", error.message);
      return res.status(500).json({ status: "error", message: "Failed to update profile" });
    }

    const returnedSettings = (user.settings as Record<string, any>) || {};
    const returnedProfile = returnedSettings.profile || {};

    res.json({
      status: "success",
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        settings: user.settings || {},
        state: returnedProfile.state || "",
        targetYear: returnedProfile.targetYear || "",
        optionalSubject: returnedProfile.optionalSubject || "",
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/user/settings
 */
/**
 * GET /api/user/sessions
 */
export const getSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Return current session info based on request metadata
    // In a full implementation this would query an active_sessions table
    const ua = req.headers["user-agent"] || "Unknown";
    const currentSession = {
      id: "current",
      userAgent: ua,
      lastSeenAt: new Date().toISOString(),
      isCurrent: true,
    };
    res.json({ status: "success", data: [currentSession] });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/user/sessions/:id
 */
export const revokeSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (id === "current") {
      return res.status(400).json({ status: "error", message: "Cannot revoke current session via this endpoint" });
    }
    // Mock: in production this would delete the session from DB/Redis
    res.json({ status: "success", message: "Session revoked" });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { notifications, preferences, privacy } = req.body;

    // Merge with existing settings
    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("settings")
      .eq("id", req.user!.id)
      .single();

    const currentSettings = (existing?.settings as Record<string, any>) || {};
    const merged: Record<string, any> = { ...currentSettings };
    if (notifications !== undefined) merged.notifications = notifications;
    if (preferences !== undefined) merged.preferences = preferences;
    if (privacy !== undefined) merged.privacy = privacy;

    const { error } = await supabaseAdmin
      .from("users")
      .update({ settings: merged })
      .eq("id", req.user!.id);

    if (error) {
      console.error("[User] updateSettings error:", error.message);
      return res.status(500).json({ status: "error", message: "Failed to update settings" });
    }

    res.json({ status: "success", data: merged });
  } catch (error) {
    next(error);
  }
};
