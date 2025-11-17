const { generatePRDescription, runCombinedTasks, formatCombinedReport } = require("../../src/commandHandler");

// Mock the github module before importing commandHandler
jest.mock("../../src/github");
const github = require("../../src/github");

describe("commandHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generatePRDescription", () => {
    it("should update PR description successfully", async () => {
      github.updatePullRequest.mockResolvedValue({ body: "Updated description" });

      const result = await generatePRDescription({
        token: "test-token",
        owner: "test-owner",
        repo: "test-repo",
        prNumber: 123,
        completion: {
          content: "## Description\nTest PR description",
          model: "gpt-4o-mini",
          provider: "chatgpt"
        }
      });

      expect(result).toBe(true);
      expect(github.updatePullRequest).toHaveBeenCalledWith({
        token: "test-token",
        owner: "test-owner",
        repo: "test-repo",
        prNumber: 123,
        body: "## Description\nTest PR description"
      });
    });

    it("should handle update failures gracefully", async () => {
      github.updatePullRequest.mockRejectedValue(new Error("API Error"));

      const result = await generatePRDescription({
        token: "test-token",
        owner: "test-owner",
        repo: "test-repo",
        prNumber: 123,
        completion: {
          content: "Test description",
          model: "gpt-4o-mini",
          provider: "chatgpt"
        }
      });

      expect(result).toBe(false);
    });
  });

  describe("runCombinedTasks", () => {
    it("should run all three tasks and return results", async () => {
      const mockTryProviders = jest.fn()
        .mockResolvedValueOnce({ content: "Summary content", model: "gpt-4o-mini", provider: "chatgpt" })
        .mockResolvedValueOnce({ content: "Review content", model: "gpt-4o-mini", provider: "chatgpt" })
        .mockResolvedValueOnce({ content: "Suggestions content", model: "gpt-4o-mini", provider: "chatgpt" });

      const mockBuildPrompt = jest.fn().mockReturnValue("Test prompt");

      const results = await runCombinedTasks({
        tryProviders: mockTryProviders,
        buildPrompt: mockBuildPrompt,
        prMetadata: { title: "Test PR", number: 123 },
        files: [{ filename: "test.js", status: "modified" }],
        maxDiffChars: 12000,
        additionalContext: "",
        guidance: {},
        providerPreference: ["chatgpt"],
        models: { chatgpt: "gpt-4o-mini", claude: "claude-3-5-sonnet" },
        selfHostedConfig: {},
        maxTokens: 16000,
        maxCompletionTokensMode: "auto"
      });

      expect(results).toHaveLength(3);
      expect(results[0].task).toBe("summary");
      expect(results[1].task).toBe("review");
      expect(results[2].task).toBe("suggestions");
      expect(results[0].content).toBe("Summary content");
      expect(results[1].content).toBe("Review content");
      expect(results[2].content).toBe("Suggestions content");
      expect(mockBuildPrompt).toHaveBeenCalledTimes(3);
      expect(mockTryProviders).toHaveBeenCalledTimes(3);
    });

    it("should handle individual task failures gracefully", async () => {
      const mockTryProviders = jest.fn()
        .mockResolvedValueOnce({ content: "Summary content", model: "gpt-4o-mini", provider: "chatgpt" })
        .mockRejectedValueOnce(new Error("Review failed"))
        .mockResolvedValueOnce({ content: "Suggestions content", model: "gpt-4o-mini", provider: "chatgpt" });

      const mockBuildPrompt = jest.fn().mockReturnValue("Test prompt");

      const results = await runCombinedTasks({
        tryProviders: mockTryProviders,
        buildPrompt: mockBuildPrompt,
        prMetadata: { title: "Test PR", number: 123 },
        files: [{ filename: "test.js", status: "modified" }],
        maxDiffChars: 12000,
        additionalContext: "",
        guidance: {},
        providerPreference: ["chatgpt"],
        models: { chatgpt: "gpt-4o-mini", claude: "claude-3-5-sonnet" },
        selfHostedConfig: {},
        maxTokens: 16000,
        maxCompletionTokensMode: "auto"
      });

      expect(results).toHaveLength(3);
      expect(results[0].task).toBe("summary");
      expect(results[0].content).toBe("Summary content");
      expect(results[1].task).toBe("review");
      expect(results[1].content).toContain("Failed to generate review");
      expect(results[1].model).toBeNull();
      expect(results[2].task).toBe("suggestions");
      expect(results[2].content).toBe("Suggestions content");
    });

    it("should handle all tasks failing", async () => {
      const mockTryProviders = jest.fn()
        .mockRejectedValueOnce(new Error("Summary failed"))
        .mockRejectedValueOnce(new Error("Review failed"))
        .mockRejectedValueOnce(new Error("Suggestions failed"));

      const mockBuildPrompt = jest.fn().mockReturnValue("Test prompt");

      const results = await runCombinedTasks({
        tryProviders: mockTryProviders,
        buildPrompt: mockBuildPrompt,
        prMetadata: { title: "Test PR", number: 123 },
        files: [],
        maxDiffChars: 12000,
        additionalContext: "",
        guidance: {},
        providerPreference: ["chatgpt"],
        models: { chatgpt: "gpt-4o-mini" },
        selfHostedConfig: {},
        maxTokens: 16000,
        maxCompletionTokensMode: "auto"
      });

      expect(results).toHaveLength(3);
      expect(results[0].content).toContain("Failed to generate summary");
      expect(results[1].content).toContain("Failed to generate review");
      expect(results[2].content).toContain("Failed to generate suggestions");
    });
  });

  describe("formatCombinedReport", () => {
    it("should format combined results into single markdown report", () => {
      const results = [
        { task: "summary", content: "This PR adds new features", model: "gpt-4o-mini", provider: "chatgpt" },
        { task: "review", content: "Code looks good overall", model: "gpt-4o-mini", provider: "chatgpt" },
        { task: "suggestions", content: "Consider adding tests", model: "gpt-4o-mini", provider: "chatgpt" }
      ];

      const report = formatCombinedReport({
        results,
        repo: "owner/repo",
        prNumber: 123,
        packageVersion: "1.0.0"
      });

      expect(report).toContain("# 📊 Complete AI Analysis Report");
      expect(report).toContain("## 📝 Summary");
      expect(report).toContain("This PR adds new features");
      expect(report).toContain("## 🔍 Code Review");
      expect(report).toContain("Code looks good overall");
      expect(report).toContain("## 💡 Improvement Suggestions");
      expect(report).toContain("Consider adding tests");
      expect(report).toContain("---");
      expect(report).toContain("next-gen-ai-reviewer v1.0.0");
      expect(report).toContain("owner/repo#123");
      expect(report).toContain("summary: chatgpt (gpt-4o-mini)");
      expect(report).toContain("review: chatgpt (gpt-4o-mini)");
      expect(report).toContain("suggestions: chatgpt (gpt-4o-mini)");
    });

    it("should handle results with null providers", () => {
      const results = [
        { task: "summary", content: "Summary content", model: null, provider: null },
        { task: "review", content: "_Failed to generate review_", model: null, provider: null },
        { task: "suggestions", content: "Suggestions content", model: "gpt-4o-mini", provider: "chatgpt" }
      ];

      const report = formatCombinedReport({
        results,
        repo: "owner/repo",
        prNumber: 456,
        packageVersion: "1.0.0"
      });

      expect(report).toContain("# 📊 Complete AI Analysis Report");
      expect(report).toContain("Summary content");
      expect(report).toContain("_Failed to generate review_");
      expect(report).toContain("Suggestions content");
      expect(report).toContain("suggestions: chatgpt (gpt-4o-mini)");
      expect(report).not.toContain("summary: ");
      expect(report).not.toContain("review: ");
    });

    it("should handle empty results", () => {
      const results = [];

      const report = formatCombinedReport({
        results,
        repo: "owner/repo",
        prNumber: 789,
        packageVersion: "1.0.0"
      });

      expect(report).toContain("# 📊 Complete AI Analysis Report");
      expect(report).toContain("next-gen-ai-reviewer v1.0.0");
      expect(report).toContain("owner/repo#789");
    });

    it("should separate sections with dividers", () => {
      const results = [
        { task: "summary", content: "Summary", model: "gpt-4o-mini", provider: "chatgpt" },
        { task: "review", content: "Review", model: "claude-3-5-sonnet", provider: "claude" }
      ];

      const report = formatCombinedReport({
        results,
        repo: "test/repo",
        prNumber: 1,
        packageVersion: "1.0.0"
      });

      const dividerCount = (report.match(/---/g) || []).length;
      expect(dividerCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe("integration", () => {
    it("should work with real-world-like data", () => {
      const results = [
        {
          task: "summary",
          content: "## Summary\n\nThis PR implements user authentication using JWT tokens. It adds login and registration endpoints, middleware for token validation, and updates the user model.",
          model: "gpt-4o-mini",
          provider: "chatgpt"
        },
        {
          task: "review",
          content: "## High Priority\n\n- Missing input validation on login endpoint\n- JWT secret should be in environment variable\n\n## Medium Priority\n\n- Consider adding rate limiting\n- Add unit tests for auth middleware",
          model: "gpt-4o-mini",
          provider: "chatgpt"
        },
        {
          task: "suggestions",
          content: "1. Add refresh token mechanism for better security\n2. Implement password strength validation\n3. Consider using bcrypt for password hashing\n4. Add logging for failed login attempts",
          model: "gpt-4o-mini",
          provider: "chatgpt"
        }
      ];

      const report = formatCombinedReport({
        results,
        repo: "mycompany/api-server",
        prNumber: 42,
        packageVersion: "1.0.0"
      });

      expect(report).toContain("Complete AI Analysis Report");
      expect(report).toContain("user authentication");
      expect(report).toContain("Missing input validation");
      expect(report).toContain("refresh token mechanism");
      expect(report).toContain("mycompany/api-server#42");
    });
  });
});
