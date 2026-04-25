import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase";

export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data: notifications } = await supabaseAdmin
      .from("notifications")
      .select("id, title, body, type, read, created_at")
      .eq("user_id", req.user!.id)
      .order("created_at", { ascending: false })
      .limit(50);

    res.json({ status: "success", data: notifications || [] });
  } catch (error) {
    next(error);
  }
};

export const createNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, body, type = "general" } = req.body;
    if (!title || !body) {
      return res.status(400).json({ status: "error", message: "Title and body are required" });
    }

    const { data, error } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: req.user!.id,
        title,
        body,
        type,
        read: false,
      })
      .select("id, title, body, type, read, created_at")
      .single();

    if (error) {
      console.error("[Notification] create error:", error.message);
      return res.status(500).json({ status: "error", message: "Failed to create notification" });
    }

    res.json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};

export const markRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .eq("user_id", req.user!.id);

    if (error) {
      console.error("[Notification] markRead error:", error.message);
      return res.status(500).json({ status: "error", message: "Failed to mark as read" });
    }

    res.json({ status: "success", message: "Marked as read" });
  } catch (error) {
    next(error);
  }
};

export const markAllRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error } = await supabaseAdmin
      .from("notifications")
      .update({ read: true })
      .eq("user_id", req.user!.id)
      .eq("read", false);

    if (error) {
      console.error("[Notification] markAllRead error:", error.message);
      return res.status(500).json({ status: "error", message: "Failed to mark all as read" });
    }

    res.json({ status: "success", message: "All notifications marked as read" });
  } catch (error) {
    next(error);
  }
};
