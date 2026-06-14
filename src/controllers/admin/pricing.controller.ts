import { Request, Response, NextFunction } from "express";
import prisma from "../../config/database";

export const getPricingPlansAdmin = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await prisma.pricingPlan.findMany({ orderBy: { order: "asc" } });
    res.json({ status: "success", data: plans });
  } catch (error) {
    next(error);
  }
};

export const createPricingPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      price,
      duration,
      durationDays,
      features,
      isPopular,
      order,
      tier,
      billingCycle,
      originalPrice,
      entitlements,
    } = req.body;
    if (!name || price === undefined || !duration) {
      return res.status(400).json({ status: "error", message: "name, price, and duration are required" });
    }
    const plan = await prisma.pricingPlan.create({
      data: {
        name,
        price,
        duration,
        durationDays: durationDays !== undefined && durationDays !== null ? Number(durationDays) : undefined,
        features: features ?? [],
        isPopular: isPopular ?? false,
        order: order ?? 0,
        tier: tier || undefined,
        billingCycle: billingCycle || undefined,
        originalPrice: originalPrice !== undefined && originalPrice !== null ? Number(originalPrice) : undefined,
        entitlements: entitlements ?? undefined,
      },
    });
    res.status(201).json({ status: "success", data: plan });
  } catch (error) {
    next(error);
  }
};

export const updatePricingPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const {
      name,
      price,
      duration,
      durationDays,
      features,
      isPopular,
      order,
      isActive,
      tier,
      billingCycle,
      originalPrice,
      entitlements,
    } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (price !== undefined) data.price = price;
    if (duration !== undefined) data.duration = duration;
    if (durationDays !== undefined && durationDays !== null) data.durationDays = Number(durationDays);
    if (features !== undefined) data.features = features;
    if (isPopular !== undefined) data.isPopular = isPopular;
    if (order !== undefined) data.order = order;
    if (isActive !== undefined) data.isActive = isActive;
    if (tier !== undefined) data.tier = tier;
    if (billingCycle !== undefined) data.billingCycle = billingCycle;
    if (originalPrice !== undefined) data.originalPrice = originalPrice === null ? null : Number(originalPrice);
    if (entitlements !== undefined) data.entitlements = entitlements;
    const plan = await prisma.pricingPlan.update({ where: { id }, data });
    res.json({ status: "success", data: plan });
  } catch (error) {
    next(error);
  }
};

export const deletePricingPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await prisma.pricingPlan.delete({ where: { id } });
    res.json({ status: "success", message: "Pricing plan deleted" });
  } catch (error) {
    next(error);
  }
};
