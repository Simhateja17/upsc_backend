import { Request, Response, NextFunction } from "express";
import prisma from "../../config/database";

export const getTestimonialsAdmin = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const testimonials = await prisma.testimonial.findMany({ orderBy: { order: "asc" } });
    res.json({ status: "success", data: testimonials });
  } catch (error) {
    next(error);
  }
};

export const createTestimonial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, title, content, avatarUrl, rating, order } = req.body;
    if (!name || !title || !content) {
      return res.status(400).json({ status: "error", message: "name, title, and content are required" });
    }
    const testimonial = await prisma.testimonial.create({
      data: { name, title, content, avatarUrl, rating: rating ?? 5, order: order ?? 0 },
    });
    res.status(201).json({ status: "success", data: testimonial });
  } catch (error) {
    next(error);
  }
};

export const updateTestimonial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { name, title, content, avatarUrl, rating, order, isActive } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (title !== undefined) data.title = title;
    if (content !== undefined) data.content = content;
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;
    if (rating !== undefined) data.rating = rating;
    if (order !== undefined) data.order = order;
    if (isActive !== undefined) data.isActive = isActive;
    const testimonial = await prisma.testimonial.update({ where: { id }, data });
    res.json({ status: "success", data: testimonial });
  } catch (error) {
    next(error);
  }
};

export const deleteTestimonial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await prisma.testimonial.delete({ where: { id } });
    res.json({ status: "success", message: "Testimonial deleted" });
  } catch (error) {
    next(error);
  }
};
