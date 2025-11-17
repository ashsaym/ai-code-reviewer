const { generatePRDescription, runCombinedTasks, combineTasks } = require("../../src/commandHandler");

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
          model: "gpt-5-mini",
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
          model: "gpt-5-mini",
          provider: "chatgpt"
        }
      });

      expect(result).toBe(false);
    });
  });

  describe("runCombinedTasks", () => {
    it("should run all three tasks and return completions", async () => {
      const mockTryProviders = jest.fn()
        .mockResolvedValueOnce({ content: "Summary content", model: "gpt-5-mini", provider: "chatgpt" })
        .mockResolvedValueOnce({ content: "Review content", model: "gpt-5-mini", provider: "chatgpt" })
        .mockResolvedValueOnce({ content: "Suggestions content", model: "gpt-5-mini", provider: "chatgpt" });

      const mockBuildPrompt = jest.fn().mockReturnValue("Test prompt");
      const mockBuildInlineReviewPrompt = jest.fn().mockReturnValue("Test inline prompt");

      const completions = await runCombinedTasks({
        tryProviders: mockTryProviders,
        buildPrompt: mockBuildPrompt,
        buildInlineReviewPrompt: mockBuildInlineReviewPrompt,
        prMetadata: { title: "Test PR", number: 123 },
        files: [{ filename: "test.js", status: "modified" }],
        maxDiffChars: 12000,
        additionalContext: "",
        guidance: {},
        providerPreference: ["chatgpt"],
        models: { chatgpt: "gpt-5-mini", claude: "claude-3-5-sonnet" },
        selfHostedConfig: {},
        maxTokens: 16000,
        maxCompletionTokensMode: "auto"
      });

      expect(completions.summary).toBeDefined();
      expect(completions.review).toBeDefined();
      expect(completions.suggestions).toBeDefined();
      expect(completions.summary.content).toBe("Summary content");
      expect(completions.review.content).toBe("Review content");
      expect(completions.suggestions.content).toBe("Suggestions content");
      expect(mockBuildPrompt).toHaveBeenCalledTimes(2); // summary and suggestions
      expect(mockBuildInlineReviewPrompt).toHaveBeenCalledTimes(1); // review
      expect(mockTryProviders).toHaveBeenCalledTimes(3);
    });

    it("should handle individual task failures gracefully", async () => {
      const mockTryProviders = jest.fn()
        .mockResolvedValueOnce({ content: "Summary content", model: "gpt-5-mini", provider: "chatgpt" })
        .mockRejectedValueOnce(new Error("Review failed"))
        .mockResolvedValueOnce({ content: "Suggestions content", model: "gpt-5-mini", provider: "chatgpt" });

      const mockBuildPrompt = jest.fn().mockReturnValue("Test prompt");
      const mockBuildInlineReviewPrompt = jest.fn().mockReturnValue("Test inline prompt");

      const completions = await runCombinedTasks({
        tryProviders: mockTryProviders,
        buildPrompt: mockBuildPrompt,
        buildInlineReviewPrompt: mockBuildInlineReviewPrompt,
        prMetadata: { title: "Test PR", number: 123 },
        files: [{ filename: "test.js", status: "modified" }],
        maxDiffChars: 12000,
        additionalContext: "",
        guidance: {},
        providerPreference: ["chatgpt"],
        models: { chatgpt: "gpt-5-mini", claude: "claude-3-5-sonnet" },
        selfHostedConfig: {},
        maxTokens: 16000,
        maxCompletionTokensMode: "auto"
      });

      expect(completions.summary).toBeDefined();
      expect(completions.summary.content).toBe("Summary content");
      expect(completions.review).toBeNull();
      expect(completions.suggestions).toBeDefined();
      expect(completions.suggestions.content).toBe("Suggestions content");
    });

    it("should handle all tasks failing", async () => {
      const mockTryProviders = jest.fn()
        .mockRejectedValueOnce(new Error("Summary failed"))
        .mockRejectedValueOnce(new Error("Review failed"))
        .mockRejectedValueOnce(new Error("Suggestions failed"));

      const mockBuildPrompt = jest.fn().mockReturnValue("Test prompt");
      const mockBuildInlineReviewPrompt = jest.fn().mockReturnValue("Test inline prompt");

      const completions = await runCombinedTasks({
        tryProviders: mockTryProviders,
        buildPrompt: mockBuildPrompt,
        buildInlineReviewPrompt: mockBuildInlineReviewPrompt,
        prMetadata: { title: "Test PR", number: 123 },
        files: [],
        maxDiffChars: 12000,
        additionalContext: "",
        guidance: {},
        providerPreference: ["chatgpt"],
        models: { chatgpt: "gpt-5-mini" },
        selfHostedConfig: {},
        maxTokens: 16000,
        maxCompletionTokensMode: "auto"
      });

      expect(completions.summary).toBeNull();
      expect(completions.review).toBeNull();
      expect(completions.suggestions).toBeNull();
    });
  });

  describe("combineTasks", () => {
    it("should combine completions into single comment body", () => {
      const completions = {
        summary: { content: "This PR adds new features", model: "gpt-5-mini", provider: "chatgpt" },
        review: { content: "Code looks good overall", model: "gpt-5-mini", provider: "chatgpt" },
        suggestions: { content: "Consider adding tests", model: "gpt-5-mini", provider: "chatgpt" }
      };

      const body = combineTasks({
        completions,
        repo: "owner/repo",
        prNumber: 123,
        packageVersion: "1.0.0"
      });

      expect(body).toContain("This PR adds new features");
      expect(body).toContain("Code looks good overall");
      expect(body).toContain("Consider adding tests");
      expect(body).toContain("---");
      expect(body).toContain("next-gen-ai-reviewer v1.0.0");
      expect(body).toContain("owner/repo#123");
      expect(body).toContain("summary: chatgpt (gpt-5-mini)");
      expect(body).toContain("review: chatgpt (gpt-5-mini)");
      expect(body).toContain("suggestions: chatgpt (gpt-5-mini)");
    });

    it("should handle null completions", () => {
      const completions = {
        summary: { content: "Summary content", model: "gpt-5-mini", provider: "chatgpt" },
        review: null,
        suggestions: { content: "Suggestions content", model: "gpt-5-mini", provider: "chatgpt" }
      };

      const body = combineTasks({
        completions,
        repo: "owner/repo",
        prNumber: 456,
        packageVersion: "1.0.0"
      });

      expect(body).toContain("Summary content");
      expect(body).toContain("Suggestions content");
      expect(body).toContain("suggestions: chatgpt (gpt-5-mini)");
      expect(body).not.toContain("review: ");
    });

    it("should handle empty completions", () => {
      const completions = {};

      const body = combineTasks({
        completions,
        repo: "owner/repo",
        prNumber: 789,
        packageVersion: "1.0.0"
      });

      expect(body).toContain("next-gen-ai-reviewer v1.0.0");
      expect(body).toContain("owner/repo#789");
    });

    it("should separate sections with dividers", () => {
      const completions = {
        summary: { content: "Summary", model: "gpt-5-mini", provider: "chatgpt" },
        review: { content: "Review", model: "claude-3-5-sonnet", provider: "claude" }
      };

      const body = combineTasks({
        completions,
        repo: "test/repo",
        prNumber: 1,
        packageVersion: "1.0.0"
      });

      const dividerCount = (body.match(/---/g) || []).length;
      expect(dividerCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe("integration", () => {
    it("should work with real-world-like data", () => {
      const completions = {
        summary: {
          content: "## Summary\n\nThis PR implements user authentication using JWT tokens. It adds login and registration endpoints, middleware for token validation, and updates the user model.",
          model: "gpt-5-mini",
          provider: "chatgpt"
        },
        review: {
          content: "## High Priority\n\n- Missing input validation on login endpoint\n- JWT secret should be in environment variable\n\n## Medium Priority\n\n- Consider adding rate limiting\n- Add unit tests for auth middleware",
          model: "gpt-5-mini",
          provider: "chatgpt"
        },
        suggestions: {
          content: "1. Add refresh token mechanism for better security\n2. Implement password strength validation\n3. Consider using bcrypt for password hashing\n4. Add logging for failed login attempts",
          model: "gpt-5-mini",
          provider: "chatgpt"
        }
      };

      const body = combineTasks({
        completions,
        repo: "mycompany/api-server",
        prNumber: 42,
        packageVersion: "1.0.0"
      });

            expect(body).toContain("user authentication");
      expect(body).toContain("Missing input validation");
      expect(body).toContain("refresh token mechanism");
      expect(body).toContain("mycompany/api-server#42");
    });
  });
});
