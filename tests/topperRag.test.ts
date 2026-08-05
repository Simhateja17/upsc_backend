import { describe, expect, it, vi } from "vitest";

vi.mock("../src/config/supabase", () => ({ supabaseAdmin: null }));
vi.mock("../src/services/embedding.service", () => ({ embedText: vi.fn() }));

import { normalizePaperGroup } from "../src/services/topperRag.service";

describe("normalizePaperGroup", () => {
  it("maps roman numeral GS paper labels correctly", () => {
    expect(normalizePaperGroup("GS Paper I")).toBe("GS Paper 1");
    expect(normalizePaperGroup("GS Paper II")).toBe("GS Paper 2");
    expect(normalizePaperGroup("GS Paper III")).toBe("GS Paper 3");
    expect(normalizePaperGroup("GS Paper IV")).toBe("GS Paper 4");
  });

  it("maps digit labels correctly", () => {
    expect(normalizePaperGroup("GS Paper 1")).toBe("GS Paper 1");
    expect(normalizePaperGroup("GS Paper 2")).toBe("GS Paper 2");
    expect(normalizePaperGroup("Essay")).toBe("Essay");
  });
});
