import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";

function param(req: Request, key: string): string {
  const v = req.params[key];
  return Array.isArray(v) ? v[0] : (v ?? "");
}

function displayName(user: any): string {
  return [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || "Aspirant";
}

function mapGroup(group: any) {
  return {
    ...group,
    icon: group.icon ?? "👥",
    memberCount: group.memberCount ?? group._count?.members ?? 0,
    isAdmin: group.isAdmin ?? false,
    unreadCount: group.unreadCount ?? 0,
    lastActivity: group.lastActivity ?? group.updatedAt ?? group.createdAt ?? null,
  };
}

function mapMember(member: any) {
  return {
    ...member,
    userId: member.userId,
    name: member.name ?? displayName(member.user),
    avatarUrl: member.avatarUrl ?? member.user?.avatarUrl ?? null,
    role: member.role ?? "member",
  };
}

function mapMessage(message: any) {
  return {
    ...message,
    userName: message.userName ?? displayName(message.user),
    userAvatarUrl: message.userAvatarUrl ?? message.user?.avatarUrl ?? null,
    isEdited: message.isEdited ?? false,
  };
}

// ==================== PUBLIC / AUTHENTICATED ====================

/**
 * GET /api/study-groups
 * List all study groups with member counts.
 */
export const getGroups = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const subject = req.query.subject as string | undefined;
    const status = req.query.status as string | undefined;

    const where: any = {};
    if (subject) where.subject = subject;
    if (status) where.status = status;

    const groups = await prisma.studyGroup.findMany({
      where,
      include: {
        creator: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        _count: { select: { members: true } },
        members: userId ? { where: { userId, isActive: true }, select: { id: true } } : false,
      },
      orderBy: { createdAt: "desc" },
    });

    const data = groups.map((g) => mapGroup({
      id: g.id,
      name: g.name,
      description: g.description,
      subject: g.subject,
      status: g.status,
      maxMembers: g.maxMembers,
      createdById: g.createdById,
      creator: g.creator,
      memberCount: g._count.members,
      isMember: userId ? g.members.length > 0 : false,
      createdAt: g.createdAt,
    }));

    res.json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/study-groups/:id
 * Get a single study group with members and messages preview.
 */
export const getGroup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = param(req, "id");
    const userId = req.user?.id;

    const group = await prisma.studyGroup.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        _count: { select: { members: true } },
        members: {
          where: { isActive: true },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
          take: 20,
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });

    if (!group) {
      res.status(404).json({ status: "error", message: "Group not found" });
      return;
    }

    const isMember = userId
      ? group.members.some((m) => m.userId === userId)
      : false;

    const mappedGroup = mapGroup({
      id: group.id,
      name: group.name,
      description: group.description,
      subject: group.subject,
      status: group.status,
      maxMembers: group.maxMembers,
      createdById: group.createdById,
      creator: group.creator,
      memberCount: group._count.members,
      isMember,
      createdAt: group.createdAt,
    });
    const members = group.members.map(mapMember);
    const recentMessages = group.messages.reverse().map(mapMessage);

    res.json({
      status: "success",
      data: {
        ...mappedGroup,
        group: mappedGroup,
        members,
        messages: recentMessages,
        recentMessages,
        sharedResources: [],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/study-groups
 * Create a new study group.
 */
export const createGroup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { name, description, subject, status, maxMembers } = req.body;
    const finalSubject = subject || "General";

    if (!name || !finalSubject) {
      res.status(400).json({ status: "error", message: "name and subject are required" });
      return;
    }

    const group = await prisma.studyGroup.create({
      data: {
        name,
        description: description || "",
        subject: finalSubject,
        status: status || "open",
        maxMembers: maxMembers ? Number(maxMembers) : 50,
        createdById: userId,
      },
    });

    // Auto-join creator
    await prisma.studyGroupMember.create({
      data: { groupId: group.id, userId, isActive: true },
    });

    res.status(201).json({ status: "success", data: mapGroup({ ...group, memberCount: 1, isMember: true }) });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/study-groups/:id/join
 */
export const joinGroup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const groupId = param(req, "id");

    const group = await prisma.studyGroup.findUnique({
      where: { id: groupId },
      include: { _count: { select: { members: true } } },
    });

    if (!group) {
      res.status(404).json({ status: "error", message: "Group not found" });
      return;
    }

    if (group._count.members >= group.maxMembers) {
      res.status(400).json({ status: "error", message: "Group is full" });
      return;
    }

    const existing = await prisma.studyGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (existing) {
      if (existing.isActive) {
        res.status(400).json({ status: "error", message: "Already a member" });
        return;
      }
      await prisma.studyGroupMember.update({
        where: { id: existing.id },
        data: { isActive: true, joinedAt: new Date() },
      });
      res.json({ status: "success", message: "Rejoined group" });
      return;
    }

    await prisma.studyGroupMember.create({
      data: { groupId, userId, isActive: true },
    });

    res.json({ status: "success", message: "Joined group" });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/study-groups/:id/leave
 */
export const leaveGroup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const groupId = param(req, "id");

    const existing = await prisma.studyGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!existing || !existing.isActive) {
      res.status(400).json({ status: "error", message: "Not a member of this group" });
      return;
    }

    await prisma.studyGroupMember.update({
      where: { id: existing.id },
      data: { isActive: false },
    });

    res.json({ status: "success", message: "Left group" });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/study-groups/:id/messages
 */
export const getMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const groupId = param(req, "id");
    const after = req.query.after as string | undefined;

    const where: any = { groupId };
    if (after) {
      where.createdAt = { gt: new Date(after) };
    }

    const messages = await prisma.groupMessage.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    res.json({ status: "success", data: messages.map(mapMessage) });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/study-groups/:id/messages
 */
export const postMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const groupId = param(req, "id");
    const { content } = req.body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      res.status(400).json({ status: "error", message: "content is required" });
      return;
    }

    // Verify user is a member
    const membership = await prisma.studyGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!membership || !membership.isActive) {
      res.status(403).json({ status: "error", message: "You must join the group to send messages" });
      return;
    }

    const message = await prisma.groupMessage.create({
      data: {
        groupId,
        userId,
        content: content.trim(),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    res.status(201).json({ status: "success", data: mapMessage(message) });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/study-groups/my-groups
 */
export const getMyGroups = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const memberships = await prisma.studyGroupMember.findMany({
      where: { userId, isActive: true },
      include: {
        group: {
          include: {
            creator: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            _count: { select: { members: true } },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    const data = memberships.map((m) => mapGroup({
      id: m.group.id,
      name: m.group.name,
      description: m.group.description,
      subject: m.group.subject,
      status: m.group.status,
      maxMembers: m.group.maxMembers,
      createdById: m.group.createdById,
      creator: m.group.creator,
      memberCount: m.group._count.members,
      isMember: true,
      joinedAt: m.joinedAt,
      createdAt: m.group.createdAt,
    }));

    res.json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};
