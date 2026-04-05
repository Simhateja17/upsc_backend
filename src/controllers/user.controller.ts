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
    const { firstName, lastName, phone, bio } = req.body;

    const updates: Record<string, any> = {};
    if (firstName !== undefined) updates.first_name = firstName;
    if (lastName !== undefined) updates.last_name = lastName;
    if (phone !== undefined) updates.phone = phone;
    if (bio !== undefined) updates.bio = bio;

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
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/user/settings
 */
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
