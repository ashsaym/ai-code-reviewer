const {
  buildPrompt,
  buildInlineReviewPrompt,
  normalizeTask,
  TASK_LIBRARY
} = require("../../src/promptBuilder");

describe("promptBuilder", () => {
  const mockPRMetadata = {
    title: "Test PR",
    user: { login: "testuser" },
    base: { ref: "main" },
    head: { ref: "feature" },
    body: "This is a test PR description"
  };

  const mockFiles = [
    {
      filename: "test.js",
      status: "modified",
      changes: 10,
      patch: "@@ -1,1 +1,2 @@\n-old line\n+new line 1\n+new line 2"
    }
  ];

  describe("normalizeTask", () => {
    it("should normalize summary variants", () => {
      expect(normalizeTask("summary")).toBe("summary");
      expect(normalizeTask("summarize")).toBe("summary");
      expect(normalizeTask("sum")).toBe("summary");
      expect(normalizeTask("SUMMARY")).toBe("summary");
    });

    it("should normalize suggestions variants", () => {
      expect(normalizeTask("suggestions")).toBe("suggestions");
      expect(normalizeTask("suggest")).toBe("suggestions");
      expect(normalizeTask("improve")).toBe("suggestions");
      expect(normalizeTask("improvements")).toBe("suggestions");
    });

    it("should normalize description variants", () => {
      expect(normalizeTask("description")).toBe("description");
      expect(normalizeTask("desc")).toBe("description");
      expect(normalizeTask("pr-description")).toBe("description");
      expect(normalizeTask("generate-description")).toBe("description");
    });

    it("should normalize combined variants", () => {
      expect(normalizeTask("combined")).toBe("combined");
      expect(normalizeTask("all")).toBe("combined");
      expect(normalizeTask("full")).toBe("combined");
      expect(normalizeTask("complete")).toBe("combined");
      expect(normalizeTask("generate-reports")).toBe("combined");
    });

    it("should default to review for unknown tasks", () => {
      expect(normalizeTask("unknown")).toBe("review");
      expect(normalizeTask("")).toBe("review");
      expect(normalizeTask()).toBe("review");
    });
  });

  describe("TASK_LIBRARY", () => {
    it("should have all task definitions", () => {
      expect(TASK_LIBRARY.review).toBeDefined();
      expect(TASK_LIBRARY.summary).toBeDefined();
      expect(TASK_LIBRARY.suggestions).toBeDefined();
      expect(TASK_LIBRARY.description).toBeDefined();
      expect(TASK_LIBRARY.combined).toBeDefined();
    });

    it("should have correct inline support flags", () => {
      expect(TASK_LIBRARY.review.inline).toBe(true);
      expect(TASK_LIBRARY.summary.inline).toBe(false);
      expect(TASK_LIBRARY.suggestions.inline).toBe(true);
      expect(TASK_LIBRARY.description.inline).toBe(false);
      expect(TASK_LIBRARY.combined.inline).toBe(false);
    });

    it("should have labels and focus for all tasks", () => {
      expect(TASK_LIBRARY.review).toBeDefined();
      expect(TASK_LIBRARY.summary).toBeDefined();
      expect(TASK_LIBRARY.suggestions).toBeDefined();
    });

    it("should mark review and suggestions as inline-capable", () => {
      expect(TASK_LIBRARY.review.inline).toBe(true);
      expect(TASK_LIBRARY.suggestions.inline).toBe(true);
      expect(TASK_LIBRARY.summary.inline).toBe(false);
    });
  });

  describe("buildPrompt", () => {
    it("should build basic prompt with PR metadata", () => {
      const prompt = buildPrompt({
        task: "review",
        prMetadata: mockPRMetadata,
        files: mockFiles
      });

      expect(prompt).toContain("Test PR");
      expect(prompt).toContain("testuser");
      expect(prompt).toContain("feature");
      expect(prompt).toContain("main");
    });

    it("should include file changes in prompt", () => {
      const prompt = buildPrompt({
        task: "review",
        prMetadata: mockPRMetadata,
        files: mockFiles
      });

      expect(prompt).toContain("test.js");
      expect(prompt).toContain("modified");
    });

    it("should include additional context when provided", () => {
      const prompt = buildPrompt({
        task: "review",
        prMetadata: mockPRMetadata,
        files: mockFiles,
        additionalContext: "Please focus on security"
      });

      expect(prompt).toContain("Please focus on security");
    });

    it("should include guidance when provided", () => {
      const guidance = {
        instructions: "Check for null pointers",
        rulesets: "Follow coding standards"
      };

      const prompt = buildPrompt({
        task: "review",
        prMetadata: mockPRMetadata,
        files: mockFiles,
        guidance
      });

      expect(prompt).toContain("Check for null pointers");
      expect(prompt).toContain("Follow coding standards");
    });

    it("should handle empty files list", () => {
      const prompt = buildPrompt({
        task: "review",
        prMetadata: mockPRMetadata,
        files: []
      });

      expect(prompt).toContain("No file changes detected");
    });

    it("should truncate large diffs", () => {
      const largePatch = "a".repeat(15000);
      const largeFiles = [{
        filename: "large.js",
        status: "added",
        patch: largePatch
      }];

      const prompt = buildPrompt({
        task: "review",
        prMetadata: mockPRMetadata,
        files: largeFiles,
        maxDiffChars: 1000
      });

      expect(prompt).toContain("diff truncated");
    });
  });

  describe("buildInlineReviewPrompt", () => {
    it("should build inline prompt for review task", () => {
      const prompt = buildInlineReviewPrompt({
        task: "review",
        prMetadata: mockPRMetadata,
        files: mockFiles
      });

      expect(prompt).toBeDefined();
      expect(prompt).toContain("Return ONLY the JSON object");
      expect(prompt).toContain('"reviews":');
    });

    it("should build inline prompt for suggestions task", () => {
      const prompt = buildInlineReviewPrompt({
        task: "suggestions",
        prMetadata: mockPRMetadata,
        files: mockFiles
      });

      expect(prompt).toBeDefined();
      expect(prompt).toContain("JSON");
    });

    it("should return null for summary task (not inline-capable)", () => {
      const prompt = buildInlineReviewPrompt({
        task: "summary",
        prMetadata: mockPRMetadata,
        files: mockFiles
      });

      expect(prompt).toBeNull();
    });

    it("should include JSON schema in prompt", () => {
      const prompt = buildInlineReviewPrompt({
        task: "review",
        prMetadata: mockPRMetadata,
        files: mockFiles
      });

      expect(prompt).toContain('"path":');
      expect(prompt).toContain('"line":');
      expect(prompt).toContain('"comment":');
      expect(prompt).toContain('"severity":');
    });

    it("should include example output", () => {
      const prompt = buildInlineReviewPrompt({
        task: "review",
        prMetadata: mockPRMetadata,
        files: mockFiles
      });

      expect(prompt).toContain("EXAMPLE OUTPUT");
    });
  });
});
