import { describe, expect, it, vi } from "vitest";

const { prismaMock, syncStudyPlanTaskToGoogleMock } = vi.hoisted(() => ({
  prismaMock: {
    studyPlanTask: {
      create: vi.fn(),
    },
  },
  syncStudyPlanTaskToGoogleMock: vi.fn(),
}));

vi.mock("../src/config/database", () => ({ default: prismaMock }));
vi.mock("../src/services/googleCalendarSync.service", () => ({
  syncStudyPlanTaskToGoogle: syncStudyPlanTaskToGoogleMock,
  deleteStudyPlanTaskFromGoogle: vi.fn(),
}));

import {
  isValidStudyPlannerSubject,
  normalizeStudyPlannerSubject,
} from "../src/constants/subjects";
import { createTask } from "../src/controllers/studyPlanner.controller";

describe("study planner subject normalization", () => {
  it("accepts Optional Paper subjects", () => {
    expect(isValidStudyPlannerSubject(normalizeStudyPlannerSubject("Optional Paper 1"))).toBe(true);
    expect(isValidStudyPlannerSubject(normalizeStudyPlannerSubject("optional paper i"))).toBe(true);
    expect(isValidStudyPlannerSubject(normalizeStudyPlannerSubject("optional paper-2"))).toBe(true);
  });

  it("normalizes GS aliases", () => {
    expect(normalizeStudyPlannerSubject("gs 1")).toBe("GS1");
    expect(normalizeStudyPlannerSubject("gs 4")).toBe("GS4");
    expect(isValidStudyPlannerSubject(normalizeStudyPlannerSubject("gs 2"))).toBe(true);
  });

  it("keeps strict rejection for unknown subjects", () => {
    expect(isValidStudyPlannerSubject(normalizeStudyPlannerSubject("Random Subject"))).toBe(false);
  });

  it("allows a user-defined subject when creating a task", async () => {
    const createdTask = {
      id: "task-1",
      userId: "user-1",
      title: "Study my custom topic",
      subject: "asdasdas",
    };
    prismaMock.studyPlanTask.create.mockResolvedValueOnce(createdTask);

    const response = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    const next = vi.fn();

    await createTask(
      {
        user: { id: "user-1" },
        body: {
          title: "Study my custom topic",
          subject: "asdasdas",
          type: "reading",
          date: "2026-08-02",
        },
      } as any,
      response as any,
      next,
    );

    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith({ status: "success", data: createdTask });
    expect(prismaMock.studyPlanTask.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ subject: "asdasdas" }) }),
    );
    expect(next).not.toHaveBeenCalled();
  });
});
