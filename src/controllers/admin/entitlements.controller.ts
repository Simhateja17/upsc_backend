import { Request, Response, NextFunction } from "express";
import prisma from "../../config/database";

export const getUserEntitlementOverrides = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId as string;
    const overrides = await prisma.userEntitlementOverride.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ status: "success", data: overrides });
  } catch (error) {
    next(error);
  }
};

export const createUserEntitlementOverride = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId as string;
    const { planTierOverride, extraUsage, reason, expiresAt } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }

    const override = await prisma.userEntitlementOverride.create({
      data: {
        userId,
        planTierOverride: planTierOverride || null,
        extraUsage: extraUsage as any,
        reason: reason || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    res.status(201).json({ status: "success", data: override });
  } catch (error) {
    next(error);
  }
};

export const deleteUserEntitlementOverride = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await prisma.userEntitlementOverride.delete({ where: { id } });
    res.json({ status: "success", message: "Entitlement override deleted" });
  } catch (error) {
    next(error);
  }
};
