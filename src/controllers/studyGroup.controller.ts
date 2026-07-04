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

function getToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// A member counts as "studying now" only while their session is active AND
// they've checked in recently. The heartbeat comes from postFocusTime (every
// ~30s while the timer runs) plus the explicit start call, so a 90s window
// tolerates one missed beat while still dropping users who closed the tab.
const STUDYING_STALE_MS = 90_000;
function studyingCutoff(): Date {
  return new Date(Date.now() - STUDYING_STALE_MS);
}

/**
 * Returns a Map<groupId, studyingCount> for the given group ids — the number of
 * active members currently in a live study session (fresh heartbeat).
 */
async function getStudyingCounts(groupIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (groupIds.length === 0) return counts;
  const rows = await prisma.studyGroupMember.groupBy({
    by: ["groupId"],
    where: {
      groupId: { in: groupIds },
      isActive: true,
      isStudyingNow: true,
      lastActiveAt: { gt: studyingCutoff() },
    },
    _count: { _all: true },
  });
  rows.forEach((r) => counts.set(r.groupId, r._count._all));
  return counts;
}

/**
 * Returns a Map<groupId, 'pending'> for groups where the given user has an
 * outstanding join request.
 */
async function getMyPendingRequestMap(userId: string | undefined, groupIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!userId || groupIds.length === 0) return map;
  const requests = await prisma.studyGroupJoinRequest.findMany({
    where: { userId, groupId: { in: groupIds }, status: "pending" },
    select: { groupId: true, status: true },
  });
  requests.forEach((r) => map.set(r.groupId, r.status));
  return map;
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
        _count: { select: { members: { where: { isActive: true } } } },
        members: {
          where: { isActive: true },
          include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
          take: 10,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Check membership separately to avoid take limit issue
    const membershipMap = new Map<string, boolean>();
    if (userId) {
      const memberships = await prisma.studyGroupMember.findMany({
        where: { userId, isActive: true },
        select: { groupId: true },
      });
      memberships.forEach((m) => membershipMap.set(m.groupId, true));
    }

    const groupIds = groups.map((g) => g.id);
    const [studyingCounts, myRequests] = await Promise.all([
      getStudyingCounts(groupIds),
      getMyPendingRequestMap(userId, groupIds),
    ]);

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
      studyingNow: studyingCounts.get(g.id) || 0,
      isMember: membershipMap.get(g.id) || false,
      isAdmin: userId ? g.createdById === userId : false,
      myRequestStatus: myRequests.get(g.id) || "none",
      members: g.members.map((m) => m.user),
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
        _count: { select: { members: { where: { isActive: true } } } },
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
    const isAdmin = userId ? group.createdById === userId : false;
    const cutoff = studyingCutoff();
    const studyingNow = group.members.filter(
      (m) => m.isStudyingNow && m.lastActiveAt && m.lastActiveAt > cutoff
    ).length;

    // Extra admin/request context — cheap follow-up queries, only when relevant.
    const [pendingRequestCount, myRequest] = await Promise.all([
      isAdmin
        ? prisma.studyGroupJoinRequest.count({ where: { groupId: group.id, status: "pending" } })
        : Promise.resolve(0),
      userId && !isMember
        ? prisma.studyGroupJoinRequest.findUnique({
            where: { groupId_userId: { groupId: group.id, userId } },
            select: { status: true },
          })
        : Promise.resolve(null),
    ]);

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
      studyingNow,
      isMember,
      isAdmin,
      pendingRequestCount,
      myRequestStatus: isMember ? "member" : (myRequest?.status || "none"),
      createdAt: group.createdAt,
    });
    const members = group.members.map((m) => ({
      ...mapMember(m),
      isStudyingNow: !!(m.isStudyingNow && m.lastActiveAt && m.lastActiveAt > cutoff),
    }));
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
        memberAvatars: group.members.slice(0, 3).map((m) => m.user),
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
      include: {
        _count: { select: { members: { where: { isActive: true } } } },
        creator: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    if (!group) {
      res.status(404).json({ status: "error", message: "Group not found" });
      return;
    }

    if (group._count.members >= group.maxMembers) {
      res.status(400).json({ status: "error", message: "Group is full" });
      return;
    }

    // Already an active member → nothing to do, let them straight in.
    const existingMembership = await prisma.studyGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (existingMembership?.isActive) {
      res.json({ status: "success", data: { status: "member" }, message: "Already a member" });
      return;
    }

    // The room creator (admin) always joins directly — no self-approval needed.
    if (group.createdById === userId) {
      await prisma.studyGroupMember.upsert({
        where: { groupId_userId: { groupId, userId } },
        create: { groupId, userId, isActive: true },
        update: { isActive: true },
      });
      res.json({ status: "success", data: { status: "member" }, message: "Joined group" });
      return;
    }

    // Everyone else must be approved by the admin. Create/refresh a pending
    // request (a previously rejected/approved-then-left request is reopened).
    const request = await prisma.studyGroupJoinRequest.upsert({
      where: { groupId_userId: { groupId, userId } },
      create: { groupId, userId, status: "pending" },
      update: { status: "pending", respondedAt: null, createdAt: new Date() },
    });

    res.json({
      status: "success",
      data: { status: "pending", requestId: request.id, adminInitials: getCreatorInitialsFromCreator(group) },
      message: "Join request sent",
    });
  } catch (error) {
    next(error);
  }
};

function getCreatorInitialsFromCreator(group: any): string {
  const first = group?.creator?.firstName?.[0] || "";
  const last = group?.creator?.lastName?.[0] || "";
  return `${first}${last}`.toUpperCase() || "Admin";
}

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

    if (!existing) {
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
            _count: { select: { members: { where: { isActive: true } } } },
            members: { where: { isActive: true }, include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } }, take: 10 },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    const studyingCounts = await getStudyingCounts(memberships.map((m) => m.group.id));

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
      studyingNow: studyingCounts.get(m.group.id) || 0,
      isMember: true,
      isAdmin: m.group.createdById === userId,
      members: m.group.members.map((gm) => gm.user),
      joinedAt: m.joinedAt,
      createdAt: m.group.createdAt,
    }));

    res.json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};

// ==================== ROOM GOALS ====================

/**
 * GET /api/study-groups/:id/goals
 * Today's shared goals for the room, plus which ones the current user has completed.
 */
export const getGoals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const groupId = param(req, "id");
    const today = getToday();

    const goals = await prisma.studyGroupGoal.findMany({
      where: { groupId, date: today },
      orderBy: { createdAt: "asc" },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
    });

    let myCompletedGoalIds: string[] = [];
    if (userId && goals.length) {
      const completions = await prisma.studyGroupGoalCompletion.findMany({
        where: { userId, goalId: { in: goals.map((g) => g.id) } },
        select: { goalId: true },
      });
      myCompletedGoalIds = completions.map((c) => c.goalId);
    }

    res.json({
      status: "success",
      data: {
        goals: goals.map((g) => ({
          id: g.id,
          title: g.title,
          createdById: g.createdById,
          createdByName: displayName(g.createdBy),
          createdAt: g.createdAt,
        })),
        myCompletedGoalIds,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/study-groups/:id/goals
 * Add a shared goal for the room, for today.
 */
export const addGoal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const groupId = param(req, "id");
    const { title } = req.body;

    if (!title || typeof title !== "string" || !title.trim()) {
      res.status(400).json({ status: "error", message: "title is required" });
      return;
    }

    const membership = await prisma.studyGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership || !membership.isActive) {
      res.status(403).json({ status: "error", message: "You must join the group to add goals" });
      return;
    }

    const goal = await prisma.studyGroupGoal.create({
      data: { groupId, title: title.trim(), date: getToday(), createdById: userId },
    });

    res.status(201).json({
      status: "success",
      data: { id: goal.id, title: goal.title, createdById: goal.createdById, createdAt: goal.createdAt },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/study-groups/:id/goals/:goalId/toggle
 * Toggle the current user's completion of a shared room goal. Completing it
 * creates a matching task in that user's own Study Planner diary; un-completing
 * removes it (the task exists solely to represent this goal's completion).
 */
export const toggleGoal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const groupId = param(req, "id");
    const goalId = param(req, "goalId");

    const membership = await prisma.studyGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership || !membership.isActive) {
      res.status(403).json({ status: "error", message: "You must join the group to update goals" });
      return;
    }

    const goal = await prisma.studyGroupGoal.findFirst({ where: { id: goalId, groupId } });
    if (!goal) {
      res.status(404).json({ status: "error", message: "Goal not found" });
      return;
    }

    const existing = await prisma.studyGroupGoalCompletion.findUnique({
      where: { goalId_userId: { goalId, userId } },
    });

    if (existing) {
      if (existing.taskId) {
        await prisma.studyPlanTask.deleteMany({ where: { id: existing.taskId, userId } });
      }
      await prisma.studyGroupGoalCompletion.delete({ where: { id: existing.id } });
      res.json({ status: "success", data: { completed: false } });
      return;
    }

    const task = await prisma.studyPlanTask.create({
      data: {
        userId,
        title: goal.title,
        type: "study",
        date: goal.date,
        isCompleted: true,
        completedAt: new Date(),
      },
    });

    await prisma.studyGroupGoalCompletion.create({
      data: { goalId, userId, taskId: task.id },
    });

    res.json({ status: "success", data: { completed: true } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/study-groups/:id/member-times
 * Each active member's room-scoped focus time for today, plus the team total.
 */
export const getMemberTimes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const groupId = param(req, "id");
    const today = getToday();

    const members = await prisma.studyGroupMember.findMany({
      where: { groupId, isActive: true },
      include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      take: 50,
    });

    const dailyRows = members.length
      ? await prisma.studyGroupMemberDaily.findMany({
          where: { groupId, date: today, userId: { in: members.map((m) => m.userId) } },
        })
      : [];
    const secondsByUser = new Map<string, number>();
    dailyRows.forEach((r) => secondsByUser.set(r.userId, r.focusSeconds));

    const cutoff = studyingCutoff();
    const data = members.map((m) => ({
      userId: m.userId,
      name: displayName(m.user),
      avatarUrl: m.user.avatarUrl ?? null,
      focusSeconds: secondsByUser.get(m.userId) || 0,
      isStudying: !!(m.isStudyingNow && m.lastActiveAt && m.lastActiveAt > cutoff),
    }));

    const teamTotalSeconds = data.reduce((sum, m) => sum + m.focusSeconds, 0);
    const studyingNow = data.filter((m) => m.isStudying).length;

    res.json({ status: "success", data: { members: data, teamTotalSeconds, studyingNow } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/study-groups/:id/focus-time
 * Upsert the current user's cumulative room-scoped focus seconds for today.
 * Body: { seconds: number } — always the full cumulative total, not a delta.
 */
export const postFocusTime = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const groupId = param(req, "id");
    const { seconds } = req.body;

    if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) {
      res.status(400).json({ status: "error", message: "seconds must be a non-negative number" });
      return;
    }

    const membership = await prisma.studyGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership || !membership.isActive) {
      res.status(403).json({ status: "error", message: "You must join the group to log focus time" });
      return;
    }

    const today = getToday();
    const row = await prisma.studyGroupMemberDaily.upsert({
      where: { groupId_userId_date: { groupId, userId, date: today } },
      create: { groupId, userId, date: today, focusSeconds: Math.round(seconds) },
      update: { focusSeconds: Math.round(seconds) },
    });

    // A focus-time flush doubles as a presence heartbeat: while the timer runs
    // the client posts every ~30s, keeping lastActiveAt fresh so the user stays
    // in the "studying now" count.
    await prisma.studyGroupMember.update({
      where: { id: membership.id },
      data: { isStudyingNow: true, lastActiveAt: new Date() },
    });

    res.json({ status: "success", data: { focusSeconds: row.focusSeconds } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/study-groups/:id/studying
 * Explicit "Start Studying" — flips the caller's live presence on immediately
 * (before the first focus-time heartbeat) so others see them right away.
 */
export const startStudying = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const groupId = param(req, "id");

    const membership = await prisma.studyGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership || !membership.isActive) {
      res.status(403).json({ status: "error", message: "You must join the group to start studying" });
      return;
    }

    await prisma.studyGroupMember.update({
      where: { id: membership.id },
      data: { isStudyingNow: true, lastActiveAt: new Date() },
    });

    res.json({ status: "success", data: { isStudying: true } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/study-groups/:id/stop-studying
 * Pause / leave — clears the caller's live presence so they drop out of the
 * "studying now" count.
 */
export const stopStudying = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const groupId = param(req, "id");

    const membership = await prisma.studyGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership) {
      res.json({ status: "success", data: { isStudying: false } });
      return;
    }

    await prisma.studyGroupMember.update({
      where: { id: membership.id },
      data: { isStudyingNow: false },
    });

    res.json({ status: "success", data: { isStudying: false } });
  } catch (error) {
    next(error);
  }
};

// ==================== JOIN REQUESTS (ADMIN APPROVAL) ====================

/**
 * GET /api/study-groups/join-requests
 * All pending join requests across rooms the current user administers (created).
 * Powers the admin notification badge + approval panel.
 */
export const getJoinRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const requests = await prisma.studyGroupJoinRequest.findMany({
      where: { status: "pending", group: { createdById: userId } },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        group: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const data = requests.map((r) => ({
      id: r.id,
      groupId: r.groupId,
      groupName: r.group?.name || "Study Room",
      userId: r.userId,
      userName: displayName(r.user),
      userInitials: `${r.user?.firstName?.[0] || ""}${r.user?.lastName?.[0] || ""}`.toUpperCase() || "?",
      avatarUrl: r.user?.avatarUrl ?? null,
      createdAt: r.createdAt,
    }));

    res.json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/study-groups/:id/requests/:requestId/approve
 * Admin approves a pending request → the requester becomes an active member.
 */
export const approveJoinRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const groupId = param(req, "id");
    const requestId = param(req, "requestId");

    const group = await prisma.studyGroup.findUnique({
      where: { id: groupId },
      include: { _count: { select: { members: { where: { isActive: true } } } } },
    });
    if (!group) {
      res.status(404).json({ status: "error", message: "Group not found" });
      return;
    }
    if (group.createdById !== userId) {
      res.status(403).json({ status: "error", message: "Only the room admin can approve requests" });
      return;
    }

    const request = await prisma.studyGroupJoinRequest.findFirst({
      where: { id: requestId, groupId, status: "pending" },
    });
    if (!request) {
      res.status(404).json({ status: "error", message: "Request not found" });
      return;
    }

    if (group._count.members >= group.maxMembers) {
      res.status(400).json({ status: "error", message: "Group is full" });
      return;
    }

    await prisma.$transaction([
      prisma.studyGroupMember.upsert({
        where: { groupId_userId: { groupId, userId: request.userId } },
        create: { groupId, userId: request.userId, isActive: true },
        update: { isActive: true },
      }),
      prisma.studyGroupJoinRequest.update({
        where: { id: request.id },
        data: { status: "approved", respondedAt: new Date() },
      }),
    ]);

    res.json({ status: "success", data: { approved: true, userId: request.userId } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/study-groups/:id/requests/:requestId/reject
 * Admin rejects a pending request.
 */
export const rejectJoinRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const groupId = param(req, "id");
    const requestId = param(req, "requestId");

    const group = await prisma.studyGroup.findUnique({ where: { id: groupId } });
    if (!group) {
      res.status(404).json({ status: "error", message: "Group not found" });
      return;
    }
    if (group.createdById !== userId) {
      res.status(403).json({ status: "error", message: "Only the room admin can reject requests" });
      return;
    }

    const request = await prisma.studyGroupJoinRequest.findFirst({
      where: { id: requestId, groupId, status: "pending" },
    });
    if (!request) {
      res.status(404).json({ status: "error", message: "Request not found" });
      return;
    }

    await prisma.studyGroupJoinRequest.update({
      where: { id: request.id },
      data: { status: "rejected", respondedAt: new Date() },
    });

    res.json({ status: "success", data: { rejected: true, userId: request.userId } });
  } catch (error) {
    next(error);
  }
};
