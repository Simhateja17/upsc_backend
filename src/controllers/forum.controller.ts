import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";

// ── Helpers ────────────────────────────────────────────────────────────────

function getUserId(req: Request): string | undefined {
  return req.user?.id;
}

// ── GET /forum/posts ───────────────────────────────────────────────────────

export const getPosts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subject, search, sort = "latest", page = "1", limit = "10" } = req.query;
    const userId = getUserId(req);
    const skip = (Math.max(1, parseInt(page as string)) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {};
    if (subject && subject !== "all") where.subject = subject as string;
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: "insensitive" } },
        { body: { contains: search as string, mode: "insensitive" } },
      ];
    }
    if (sort === "unanswered") where.status = "open";

    const orderBy: any =
      sort === "top" ? { votes: "desc" } : { createdAt: "desc" };

    const [posts, total] = await Promise.all([
      prisma.forumPost.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { answers: true } },
          votesRel: userId ? { where: { userId } } : false,
          bookmarks: userId ? { where: { userId } } : false,
        },
      }),
      prisma.forumPost.count({ where }),
    ]);

    const data = posts.map((p) => ({
      ...p,
      answerCount: p._count.answers,
      userVote: p.votesRel?.[0]?.direction ?? 0,
      isBookmarked: p.bookmarks.length > 0,
      votesRel: undefined,
      bookmarks: undefined,
      _count: undefined,
    }));

    res.json({ status: "success", data, meta: { total, page: parseInt(page as string), limit: take } });
  } catch (error) {
    next(error);
  }
};

// ── GET /forum/posts/:id ───────────────────────────────────────────────────

export const getPost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const id = req.params.id as string;

    const post = await prisma.forumPost.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        answers: {
          orderBy: { votes: "desc" },
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
            votesRel: userId ? { where: { userId } } : false,
          },
        },
        votesRel: userId ? { where: { userId } } : false,
        bookmarks: userId ? { where: { userId } } : false,
      },
    });

    if (!post) {
      return res.status(404).json({ status: "error", message: "Post not found" });
    }

    // increment views
    await prisma.forumPost.update({ where: { id }, data: { views: { increment: 1 } } });

    const answers = post.answers.map((a) => ({
      ...a,
      userVote: a.votesRel?.[0]?.direction ?? 0,
      votesRel: undefined,
    }));

    res.json({
      status: "success",
      data: {
        ...post,
        views: post.views + 1,
        userVote: post.votesRel?.[0]?.direction ?? 0,
        isBookmarked: post.bookmarks.length > 0,
        answers,
        votesRel: undefined,
        bookmarks: undefined,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /forum/posts ──────────────────────────────────────────────────────

export const createPost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { title, body, subject, tags } = req.body;

    if (!title || !body || !subject) {
      return res.status(400).json({ status: "error", message: "Title, body and subject are required" });
    }

    const post = await prisma.forumPost.create({
      data: {
        userId,
        title,
        body,
        subject,
        tags: Array.isArray(tags) ? tags : [],
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    res.status(201).json({ status: "success", data: post });
  } catch (error) {
    next(error);
  }
};

// ── POST /forum/posts/:id/answers ──────────────────────────────────────────

export const createAnswer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const postId = req.params.id as string;
    const { body } = req.body;

    if (!body) {
      return res.status(400).json({ status: "error", message: "Answer body is required" });
    }

    const post = await prisma.forumPost.findUnique({ where: { id: postId } });
    if (!post) {
      return res.status(404).json({ status: "error", message: "Post not found" });
    }

    const [answer] = await prisma.$transaction([
      prisma.forumAnswer.create({
        data: { userId, postId, body },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      prisma.forumPost.update({
        where: { id: postId },
        data: { status: "answered" },
      }),
    ]);

    res.status(201).json({ status: "success", data: answer });
  } catch (error) {
    next(error);
  }
};

// ── POST /forum/vote ───────────────────────────────────────────────────────

export const vote = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { postId, answerId, direction } = req.body;

    if (![1, -1].includes(direction)) {
      return res.status(400).json({ status: "error", message: "Direction must be +1 or -1" });
    }
    if (!postId && !answerId) {
      return res.status(400).json({ status: "error", message: "postId or answerId required" });
    }

    const existing = await prisma.forumVote.findFirst({
      where: { userId, ...(postId ? { postId } : { answerId }) },
    });

    let voteChange = 0;

    await prisma.$transaction(async (tx) => {
      if (existing) {
        if (existing.direction === direction) {
          // remove vote
          await tx.forumVote.delete({ where: { id: existing.id } });
          voteChange = -direction;
        } else {
          // flip vote
          await tx.forumVote.update({
            where: { id: existing.id },
            data: { direction },
          });
          voteChange = direction - existing.direction; // e.g. 1 - (-1) = 2
        }
      } else {
        await tx.forumVote.create({
          data: { userId, postId: postId || null, answerId: answerId || null, direction },
        });
        voteChange = direction;
      }

      if (postId) {
        await tx.forumPost.update({
          where: { id: postId },
          data: { votes: { increment: voteChange } },
        });
      } else if (answerId) {
        await tx.forumAnswer.update({
          where: { id: answerId! },
          data: { votes: { increment: voteChange } },
        });
      }
    });

    res.json({ status: "success", data: { direction: existing?.direction === direction ? 0 : direction } });
  } catch (error) {
    next(error);
  }
};

// ── POST /forum/bookmarks ──────────────────────────────────────────────────

export const createBookmark = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { postId } = req.body;

    if (!postId) {
      return res.status(400).json({ status: "error", message: "postId is required" });
    }

    const bookmark = await prisma.forumBookmark.upsert({
      where: { userId_postId: { userId, postId } },
      create: { userId, postId },
      update: {},
    });

    res.status(201).json({ status: "success", data: bookmark });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /forum/bookmarks/:postId ────────────────────────────────────────

export const deleteBookmark = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const postId = req.params.postId as string;

    await prisma.forumBookmark.deleteMany({ where: { userId, postId } });

    res.json({ status: "success", message: "Bookmark removed" });
  } catch (error) {
    next(error);
  }
};

// ── GET /forum/my-posts ────────────────────────────────────────────────────

export const getMyPosts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const posts = await prisma.forumPost.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { answers: true } },
      },
    });

    res.json({
      status: "success",
      data: posts.map((p) => ({ ...p, answerCount: p._count.answers, _count: undefined })),
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /forum/my-answers ──────────────────────────────────────────────────

export const getMyAnswers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const answers = await prisma.forumAnswer.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        post: { select: { id: true, title: true, subject: true } },
      },
    });

    res.json({ status: "success", data: answers });
  } catch (error) {
    next(error);
  }
};

// ── GET /forum/bookmarks ───────────────────────────────────────────────────

export const getBookmarks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const bookmarks = await prisma.forumBookmark.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        post: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
            _count: { select: { answers: true } },
          },
        },
      },
    });

    const data = bookmarks.map((b) => ({
      ...b.post,
      answerCount: b.post._count.answers,
      _count: undefined,
    }));

    res.json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};

// ── GET /forum/subjects ────────────────────────────────────────────────────

export const getSubjects = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subjects = await prisma.forumPost.groupBy({
      by: ["subject"],
      _count: { id: true },
    });

    const data = subjects.map((s) => ({
      label: s.subject,
      count: s._count.id,
    }));

    res.json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};
