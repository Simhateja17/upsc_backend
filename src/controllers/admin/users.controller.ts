import { Request, Response, NextFunction } from "express";
import prisma from "../../config/database";
import { qs } from "./util";

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = qs(req.query.page as string) || "1";
    const limit = qs(req.query.limit as string) || "50";
    const search = qs(req.query.search as string);
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          _count: { select: { mcqAttempts: true, mainsAttempts: true, mockTestAttempts: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ status: "success", data: { users, total } });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { role, isActive } = req.body;

    const updateData: any = {};
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, isActive: true },
    });

    res.json({ status: "success", data: user });
  } catch (error) {
    next(error);
  }
};
