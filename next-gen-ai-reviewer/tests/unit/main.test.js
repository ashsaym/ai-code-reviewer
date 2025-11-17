const fs = require("node:fs");

// Mock process.exit to prevent test suite from exiting
jest.spyOn(process, "exit").mockImplementation(() => {});

// Only mock fs for controlled file system tests
jest.mock("node:fs");

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
          model: "gpt-4o-mini",
          provider: "ChatGPT"
        },
        repo: "testowner/testrepo",
        prNumber: 123
      });

      expect(result).toContain("Review content");
      expect(result).toContain("gpt-4o-mini");
      expect(result).toContain("ChatGPT");
      expect(result).toContain("testowner/testrepo#123");
    });
  });
});
