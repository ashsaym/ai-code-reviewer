const { generatePRDescription, runCombinedTasks, formatCombinedReport, formatCombinedReportWithInlineReview } = require("../../src/commandHandler");

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

  describe("formatCombinedReportWithInlineReview", () => {
    it("should format combined report with inline review comments", async () => {
      const summaryResult = {
        task: "summary",
        content: "This PR adds new features",
        model: "gpt-4o-mini",
        provider: "chatgpt"
      };

      const reviewResult = {
        task: "review",
        content: JSON.stringify({
          reviews: [
            {
              path: "test.js",
              line: 10,
              comment: "Consider using const instead of let",
              severity: "medium",
              suggestion: "const x = 10;"
            },
            {
              path: "test.js",
              line: 20,
              comment: "Add error handling here",
              severity: "high"
            },
            {
              path: "another.js",
              line: 5,
              comment: "Good use of async/await",
              severity: "low"
            }
          ],
          summary: "Found 3 issues"
        }),
        model: "gpt-4o-mini",
        provider: "chatgpt"
      };

      const suggestionsResult = {
        task: "suggestions",
        content: "Consider adding tests",
        model: "gpt-4o-mini",
        provider: "chatgpt"
      };

      const files = [
        {
          filename: "test.js",
          status: "modified",
          patch: "@@ -1,2 +1,20 @@\n old line\n old line\n+new line 3\n+new line 4\n+new line 5\n+new line 6\n+new line 7\n+new line 8\n+new line 9\n+new line 10\n+new line 11\n+new line 12\n+new line 13\n+new line 14\n+new line 15\n+new line 16\n+new line 17\n+new line 18\n+new line 19\n+new line 20"
        },
        {
          filename: "another.js",
          status: "modified",
          patch: "@@ -1,1 +1,5 @@\n old line\n+new line 2\n+new line 3\n+new line 4\n+new line 5"
        }
      ];

      const report = await formatCombinedReportWithInlineReview({
        summaryResult,
        reviewResult,
        suggestionsResult,
        files,
        repo: "owner/repo",
        prNumber: 123,
        packageVersion: "1.0.0"
      });

      expect(report).toContain("# 📊 Complete AI Analysis Report");
      expect(report).toContain("## 📝 Summary");
      expect(report).toContain("This PR adds new features");
      expect(report).toContain("## 🔍 Code Review");
      expect(report).toContain("Found 3 issue");
      expect(report).toContain("`test.js`");
      expect(report).toContain("`another.js`");
      expect(report).toContain("Line 10");
      expect(report).toContain("Line 20");
      expect(report).toContain("Line 5");
      expect(report).toContain("Consider using const instead of let");
      expect(report).toContain("Add error handling here");
      expect(report).toContain("Good use of async/await");
      expect(report).toContain("## 💡 Improvement Suggestions");
      expect(report).toContain("Consider adding tests");
      expect(report).toContain("next-gen-ai-reviewer v1.0.0");
    });

    it("should handle invalid review JSON gracefully", async () => {
      const summaryResult = {
        task: "summary",
        content: "Summary content",
        model: "gpt-4o-mini",
        provider: "chatgpt"
      };

      const reviewResult = {
        task: "review",
        content: "Invalid JSON content",
        model: "gpt-4o-mini",
        provider: "chatgpt"
      };

      const suggestionsResult = {
        task: "suggestions",
        content: "Suggestions content",
        model: "gpt-4o-mini",
        provider: "chatgpt"
      };

      const report = await formatCombinedReportWithInlineReview({
        summaryResult,
        reviewResult,
        suggestionsResult,
        files: [],
        repo: "owner/repo",
        prNumber: 123,
        packageVersion: "1.0.0"
      });

      expect(report).toContain("# 📊 Complete AI Analysis Report");
      expect(report).toContain("Invalid JSON content");
    });

    it("should handle null results", async () => {
      const report = await formatCombinedReportWithInlineReview({
        summaryResult: null,
        reviewResult: null,
        suggestionsResult: null,
        files: [],
        repo: "owner/repo",
        prNumber: 123,
        packageVersion: "1.0.0"
      });

      expect(report).toContain("# 📊 Complete AI Analysis Report");
      expect(report).toContain("next-gen-ai-reviewer v1.0.0");
    });

    it("should handle empty reviews array", async () => {
      const reviewResult = {
        task: "review",
        content: JSON.stringify({
          reviews: [],
          summary: "No issues found"
        }),
        model: "gpt-4o-mini",
        provider: "chatgpt"
      };

      const report = await formatCombinedReportWithInlineReview({
        summaryResult: null,
        reviewResult,
        suggestionsResult: null,
        files: [],
        repo: "owner/repo",
        prNumber: 123,
        packageVersion: "1.0.0"
      });

      expect(report).toContain("## 🔍 Code Review");
      expect(report).toContain("No specific issues found");
    });

    it("should group comments by file", async () => {
      const reviewResult = {
        task: "review",
        content: JSON.stringify({
          reviews: [
            { path: "a.js", line: 1, comment: "Issue 1", severity: "low" },
            { path: "a.js", line: 2, comment: "Issue 2", severity: "medium" },
            { path: "b.js", line: 10, comment: "Issue 3", severity: "high" }
          ]
        }),
        model: "gpt-4o-mini",
        provider: "chatgpt"
      };

      const files = [
        { filename: "a.js", patch: "@@ -1,2 +1,2 @@\n+line 1\n+line 2" },
        { filename: "b.js", patch: "@@ -10,1 +10,1 @@\n+line 10" }
      ];

      const report = await formatCombinedReportWithInlineReview({
        summaryResult: null,
        reviewResult,
        suggestionsResult: null,
        files,
        repo: "owner/repo",
        prNumber: 123,
        packageVersion: "1.0.0"
      });

      expect(report).toContain("`a.js`");
      expect(report).toContain("`b.js`");
      expect(report).toContain("Issue 1");
      expect(report).toContain("Issue 2");
      expect(report).toContain("Issue 3");
    });
  });
});
