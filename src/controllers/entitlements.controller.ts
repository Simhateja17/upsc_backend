import { Request, Response, NextFunction } from "express";
import { getEntitlementSummary } from "../services/entitlements.service";

export const getMyEntitlements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const summary = await getEntitlementSummary(userId);
    res.json({ status: "success", data: summary });
  } catch (error) {
    next(error);
  }
};
