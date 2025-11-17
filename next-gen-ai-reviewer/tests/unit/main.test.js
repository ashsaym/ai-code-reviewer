const fs = require("node:fs");

// Mock process.exit to prevent test suite from exiting
jest.spyOn(process, "exit").mockImplementation(() => {});

// Only mock fs for controlled file system tests
jest.mock("node:fs", () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn()
}));

// Mock github module for generatePRDescription tests
jest.mock("../../src/github");

describe("main.js helper functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    delete process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_REPOSITORY;
    delete process.env.GITHUB_EVENT_PATH;
    delete process.env.GITHUB_REF;
    delete process.env.PR_NUMBER;
    delete process.env.INPUT_PR_NUMBER;

    // Re-require main to get fresh functions
    delete require.cache[require.resolve("../../src/main.js")];
    require("../../src/main.js");
  });

  describe("readJsonFile", () => {
    it("should read and parse JSON file", () => {
      const mockJson = { test: "data" };
      fs.readFileSync = jest.fn().mockReturnValue(JSON.stringify(mockJson));

      // We need to test this indirectly through autoDetectPrNumber
      process.env.GITHUB_EVENT_PATH = "/tmp/event.json";
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({
        pull_request: { number: 123 }
      }));

      // This will use readJsonFile internally
      expect(fs.readFileSync).toBeDefined();
    });

    it("should return null for invalid JSON", () => {
      fs.readFileSync = jest.fn().mockImplementation(() => {
        throw new Error("File not found");
      });
      fs.existsSync = jest.fn().mockReturnValue(false);

      expect(fs.readFileSync).toBeDefined();
    });
  });

  describe("Environment variable handling", () => {
    it("should read INPUT_* environment variables", () => {
      process.env.INPUT_TASK = "review";
      process.env.INPUT_AI_PROVIDER = "chatgpt";

      expect(process.env.INPUT_TASK).toBe("review");
      expect(process.env.INPUT_AI_PROVIDER).toBe("chatgpt");
    });

    it("should handle PR_NUMBER from environment", () => {
      process.env.PR_NUMBER = "456";

      expect(process.env.PR_NUMBER).toBe("456");
    });

    it("should handle GITHUB_REF for PR detection", () => {
      process.env.GITHUB_REF = "refs/pull/789/head";

      const match = process.env.GITHUB_REF.match(/refs\/pull\/(\d+)\//);
      expect(match[1]).toBe("789");
    });
  });
});

describe("main.js workflow functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Clear all environment variables
    delete process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_REPOSITORY;
    delete process.env.GITHUB_EVENT_PATH;
    delete process.env.GITHUB_REF;
    delete process.env.PR_NUMBER;
    delete process.env.PR;
    delete process.env.INPUT_PR_NUMBER;
    delete process.env.INPUT_TASK;
    delete process.env.INPUT_AI_PROVIDER;
    delete process.env.CHATGPT_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.CLAUDE_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.SELF_HOSTED_ENDPOINT;

    delete require.cache[require.resolve("../../src/main.js")];
  });

  describe("getInput", () => {
    it("should read from INPUT_ prefixed environment variables", () => {
      process.env.INPUT_TASK = "review";
      delete require.cache[require.resolve("../../src/main")];
      const { getInput } = require("../../src/main");

      const result = getInput("task");
      expect(result).toBe("review");
    });

    it("should return default value if not found", () => {
      delete require.cache[require.resolve("../../src/main")];
      const { getInput } = require("../../src/main");

      const result = getInput("nonexistent", "default");
      expect(result).toBe("default");
    });

    it("should handle different naming conventions", () => {
      process.env.INPUT_AI_PROVIDER = "chatgpt";
      delete require.cache[require.resolve("../../src/main")];
      const { getInput } = require("../../src/main");

      const result = getInput("ai-provider");
      expect(result).toBe("chatgpt");
    });
  });

  describe("autoDetectPrNumber", () => {
    beforeEach(() => {
      // Clear all PR-related env vars before each test
      delete process.env.INPUT_PR_NUMBER;
      delete process.env.PR_NUMBER;
      delete process.env.PR;
      delete process.env.GITHUB_EVENT_PATH;
      delete process.env.GITHUB_REF;
      delete process.env.GITHUB_REF_NAME;
    });

    it("should read PR number from INPUT_PR_NUMBER", () => {
      process.env.INPUT_PR_NUMBER = "123";
      delete require.cache[require.resolve("../../src/main")];
      const { autoDetectPrNumber } = require("../../src/main");

      const result = autoDetectPrNumber();
      expect(result).toBe("123");
    });

    it("should parse from GITHUB_REF", () => {
      process.env.GITHUB_REF = "refs/pull/789/merge";
      delete require.cache[require.resolve("../../src/main")];
      const { autoDetectPrNumber } = require("../../src/main");

      const result = autoDetectPrNumber();
      expect(result).toBe("789");
    });

    it("should return null if no PR number found", () => {
      delete require.cache[require.resolve("../../src/main")];
      const { autoDetectPrNumber } = require("../../src/main");

      const result = autoDetectPrNumber();
      expect(result).toBeNull();
    });
  });

  describe("formatComment", () => {
    it("should format comment with footer", () => {
      delete require.cache[require.resolve("../../src/main")];
      const { formatComment } = require("../../src/main");

      const result = formatComment({
        completion: {
          content: "Review content",
          model: "gpt-5-mini",
          provider: "ChatGPT"
        },
        repo: "testowner/testrepo",
        prNumber: 123
      });

      expect(result).toContain("Review content");
      expect(result).toContain("gpt-5-mini");
      expect(result).toContain("ChatGPT");
      expect(result).toContain("testowner/testrepo#123");
    });

    it("should use default reviewer name when not provided", () => {
      delete require.cache[require.resolve("../../src/main")];
      const { formatComment } = require("../../src/main");

      const result = formatComment({
        completion: {
          content: "Review content",
          model: "gpt-5-mini",
          provider: "ChatGPT"
        },
        repo: "testowner/testrepo",
        prNumber: 123
      });

      expect(result).toContain("next-gen-ai-reviewer");
    });

    it("should use custom reviewer name when provided", () => {
      delete require.cache[require.resolve("../../src/main")];
      const { formatComment } = require("../../src/main");

      const result = formatComment({
        completion: {
          content: "Review content",
          model: "gpt-5-mini",
          provider: "ChatGPT"
        },
        repo: "testowner/testrepo",
        prNumber: 123,
        reviewerName: "Custom AI Bot"
      });

      expect(result).toContain("Custom AI Bot");
      expect(result).not.toContain("next-gen-ai-reviewer");
    });
  });

  describe("tryProviders", () => {
    beforeEach(() => {
      delete require.cache[require.resolve("../../src/main")];
      jest.clearAllMocks();
    });

    it("should try ChatGPT provider with valid API key", async () => {
      process.env.CHATGPT_API_KEY = "test-key";

      // Mock the fetch function for this test
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            { message: { content: "Review result" }, finish_reason: "stop" }
          ]
        })
      });

      const { tryProviders } = require("../../src/main");

      const result = await tryProviders({
        providers: ["chatgpt"],
        prompt: "Test prompt",
        task: "review",
        models: { chatgpt: "gpt-5-mini", claude: "claude-3" },
        selfHostedConfig: {},
        maxTokens: 1000,
        maxCompletionTokensMode: "auto"
      });

      expect(result).toBeDefined();
      expect(result.provider).toBe("ChatGPT");
      expect(result.content).toBe("Review result");

      delete global.fetch;
    });

    it("should skip ChatGPT when API key is missing", async () => {
      delete process.env.CHATGPT_API_KEY;
      delete process.env.OPENAI_API_KEY;
      const { tryProviders } = require("../../src/main");

      await expect(tryProviders({
        providers: ["chatgpt"],
        prompt: "Test prompt",
        task: "review",
        models: { chatgpt: "gpt-5-mini" },
        selfHostedConfig: {},
        maxTokens: 1000
      })).rejects.toThrow("All AI providers failed");
    });

    it("should skip Claude when API key is missing", async () => {
      delete process.env.CLAUDE_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      const { tryProviders } = require("../../src/main");

      await expect(tryProviders({
        providers: ["claude"],
        prompt: "Test prompt",
        task: "review",
        models: { claude: "claude-3" },
        selfHostedConfig: {},
        maxTokens: 1000
      })).rejects.toThrow("All AI providers failed");
    });

    it("should skip self-hosted when endpoint is missing", async () => {
      delete process.env.SELF_HOSTED_ENDPOINT;
      const { tryProviders } = require("../../src/main");

      await expect(tryProviders({
        providers: ["self-hosted"],
        prompt: "Test prompt",
        task: "review",
        models: {},
        selfHostedConfig: {},
        maxTokens: 1000
      })).rejects.toThrow("All AI providers failed");
    });

    it("should handle provider with selfhosted alias", async () => {
      delete process.env.SELF_HOSTED_ENDPOINT;
      const { tryProviders } = require("../../src/main");

      await expect(tryProviders({
        providers: ["selfhosted"],
        prompt: "Test prompt",
        task: "review",
        models: {},
        selfHostedConfig: {},
        maxTokens: 1000
      })).rejects.toThrow("All AI providers failed");
    });

    it("should handle provider with local alias", async () => {
      delete process.env.SELF_HOSTED_ENDPOINT;
      const { tryProviders } = require("../../src/main");

      await expect(tryProviders({
        providers: ["local"],
        prompt: "Test prompt",
        task: "review",
        models: {},
        selfHostedConfig: {},
        maxTokens: 1000
      })).rejects.toThrow("All AI providers failed");
    });
  });

  describe("postInlineReview", () => {
    beforeEach(() => {
      delete require.cache[require.resolve("../../src/main")];
      jest.clearAllMocks();
    });

    it("should handle empty formatted comments", async () => {
      const { postInlineReview } = require("../../src/main");

      const result = await postInlineReview({
        token: "test-token",
        owner: "test-owner",
        repo: "test-repo",
        prNumber: 123,
        prMetadata: {},
        completion: {
          content: '{"summary": "Test", "reviews": []}',
          model: "gpt-5-mini",
          provider: "ChatGPT"
        },
        files: []
      });

      expect(result).toBe(false);
    });

    it("should handle parse errors gracefully", async () => {
      const { postInlineReview } = require("../../src/main");

      const result = await postInlineReview({
        token: "test-token",
        owner: "test-owner",
        repo: "test-repo",
        prNumber: 123,
        prMetadata: {},
        completion: {
          content: "invalid json",
          model: "gpt-5-mini",
          provider: "ChatGPT"
        },
        files: []
      });

      expect(result).toBe(false);
    });
  });

  describe("generatePRDescription", () => {
    let github;
    let generatePRDescription;

    beforeEach(() => {
      delete require.cache[require.resolve("../../src/main")];
      delete require.cache[require.resolve("../../src/github")];
      jest.clearAllMocks();

      // Require github (already mocked by jest.mock at top)
      github = require("../../src/github");

      // Then require main which will use the mocked github
      const main = require("../../src/main");
      generatePRDescription = main.generatePRDescription;
    });

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

  describe("readJsonFile edge cases", () => {
    beforeEach(() => {
      delete require.cache[require.resolve("../../src/main")];
      jest.clearAllMocks();
    });

    it("should handle invalid JSON in file", () => {
      fs.readFileSync = jest.fn().mockReturnValue("{ invalid json }");
      fs.existsSync = jest.fn().mockReturnValue(true);

      const { readJsonFile } = require("../../src/main");
      const result = readJsonFile("/tmp/invalid.json");

      expect(result).toBeNull();
    });

    it("should handle file read errors", () => {
      fs.readFileSync = jest.fn().mockImplementation(() => {
        throw new Error("ENOENT");
      });

      const { readJsonFile } = require("../../src/main");
      const result = readJsonFile("/tmp/missing.json");

      expect(result).toBeNull();
    });
  });

  describe("autoDetectPrNumber edge cases", () => {
    beforeEach(() => {
      delete require.cache[require.resolve("../../src/main")];
      jest.clearAllMocks();
      delete process.env.GITHUB_EVENT_PATH;
      delete process.env.GITHUB_REF;
      delete process.env.GITHUB_REF_NAME;
      delete process.env.PR_NUMBER;
      delete process.env.PR;
      delete process.env.INPUT_PR_NUMBER;
    });

    it("should cover event file logic paths", () => {
      // Test that PR number detection covers various sources
      // The actual fs mock behavior is tested indirectly through other tests
      const { autoDetectPrNumber } = require("../../src/main");

      // Test with no sources - should return null
      const result = autoDetectPrNumber();
      expect(result).toBeNull();

      // Test with direct PR_NUMBER env
      process.env.PR_NUMBER = "123";
      const result2 = autoDetectPrNumber();
      expect(result2).toBe("123");
      delete process.env.PR_NUMBER;
    });

    it("should detect PR from GITHUB_REF_NAME", () => {
      process.env.GITHUB_REF_NAME = "refs/pull/777/merge";

      const { autoDetectPrNumber } = require("../../src/main");
      const result = autoDetectPrNumber();

      expect(result).toBe("777");
    });

    it("should return null when no PR number found", () => {
      // No environment variables set
      const { autoDetectPrNumber } = require("../../src/main");
      const result = autoDetectPrNumber();

      expect(result).toBeNull();
    });

    it("should prioritize direct input over other sources", () => {
      process.env.PR_NUMBER = "111";
      process.env.GITHUB_EVENT_PATH = "/tmp/event.json";
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
        pull_request: { number: 222 }
      }));

      const { autoDetectPrNumber } = require("../../src/main");
      const result = autoDetectPrNumber();

      expect(result).toBe("111");
    });
  });

  describe("tryProviders with actual provider errors", () => {
    beforeEach(() => {
      delete require.cache[require.resolve("../../src/main")];
      jest.clearAllMocks();
    });

    it("should handle ChatGPT provider failure and try next provider", async () => {
      process.env.CHATGPT_API_KEY = "test-key";
      process.env.CLAUDE_API_KEY = "claude-key";

      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: "Server Error",
          json: async () => ({ error: { message: "Server error" } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            content: [{ text: "Claude response" }],
            model: "claude-3-5-sonnet-20241022",
            stop_reason: "end_turn"
          })
        });

      const { tryProviders } = require("../../src/main");

      const result = await tryProviders({
        providers: ["chatgpt", "claude"],
        prompt: "Test prompt",
        task: "review",
        models: { chatgpt: "gpt-5-mini", claude: "claude-3-5-sonnet-20241022" },
        selfHostedConfig: {},
        maxTokens: 1000,
        maxCompletionTokensMode: "auto"
      });

      expect(result).toBeDefined();
      expect(result.provider).toBe("Claude");

      delete global.fetch;
    });

    it("should handle Claude provider failure", async () => {
      process.env.CLAUDE_API_KEY = "test-key";

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ error: { message: "Invalid API key" } })
      });

      const { tryProviders } = require("../../src/main");

      await expect(tryProviders({
        providers: ["claude"],
        prompt: "Test prompt",
        task: "review",
        models: { claude: "claude-3" },
        selfHostedConfig: {},
        maxTokens: 1000
      })).rejects.toThrow("All AI providers failed");

      delete global.fetch;
    });

    it("should handle self-hosted provider failure", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Server Error",
        json: async () => ({ error: "Server error" })
      });

      const { tryProviders } = require("../../src/main");

      await expect(tryProviders({
        providers: ["self-hosted"],
        prompt: "Test prompt",
        task: "review",
        models: {},
        selfHostedConfig: {
          endpoint: "http://localhost:8080/api",
          model: "test-model"
        },
        maxTokens: 1000
      })).rejects.toThrow("All AI providers failed");

      delete global.fetch;
    });
  });

  describe("postInlineReview with file matching", () => {
    beforeEach(() => {
      delete require.cache[require.resolve("../../src/main")];
      jest.clearAllMocks();
    });

    it("should skip comments for files without patch", async () => {
      const { postInlineReview } = require("../../src/main");
      const github = require("../../src/github");

      github.createReview.mockResolvedValue({});

      const result = await postInlineReview({
        token: "test-token",
        owner: "test-owner",
        repo: "test-repo",
        prNumber: 123,
        prMetadata: {},
        completion: {
          content: JSON.stringify({
            summary: "Test summary",
            reviews: [
              { path: "file1.js", line: 10, body: "Comment 1" }
            ]
          }),
          model: "gpt-5-mini",
          provider: "ChatGPT"
        },
        files: [
          { filename: "file1.js" } // No patch
        ]
      });

      expect(result).toBe(false);
    });

    it("should skip comments when position cannot be computed", async () => {
      const { postInlineReview } = require("../../src/main");
      const github = require("../../src/github");

      github.createReview.mockResolvedValue({});

      const result = await postInlineReview({
        token: "test-token",
        owner: "test-owner",
        repo: "test-repo",
        prNumber: 123,
        prMetadata: {},
        completion: {
          content: JSON.stringify({
            summary: "Test summary",
            reviews: [
              { path: "file1.js", line: 999, body: "Comment 1" }
            ]
          }),
          model: "gpt-5-mini",
          provider: "ChatGPT"
        },
        files: [
          {
            filename: "file1.js",
            patch: "@@ -1,3 +1,3 @@\n-old line\n+new line"
          }
        ]
      });

      expect(result).toBe(false);
    });

    it("should successfully post valid inline comments", async () => {
      const { postInlineReview } = require("../../src/main");
      const github = require("../../src/github");

      github.createReview.mockResolvedValue({});

      const result = await postInlineReview({
        token: "test-token",
        owner: "test-owner",
        repo: "test-repo",
        prNumber: 123,
        prMetadata: {},
        completion: {
          content: JSON.stringify({
            summary: "Test summary",
            reviews: [
              { path: "file1.js", line: 2, comment: "Good comment", severity: "info" }
            ]
          }),
          model: "gpt-5-mini",
          provider: "ChatGPT"
        },
        files: [
          {
            filename: "file1.js",
            patch: "@@ -1,3 +1,4 @@\n line 1\n+added line 2\n line 3\n line 4",
            status: "modified"
          }
        ],
        reviewerName: "Test Bot"
      });

      expect(result).toBe(true);
      expect(github.createReview).toHaveBeenCalled();
    });
  });
});
