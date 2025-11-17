const { runChatGPT } = require("../../src/providers/chatgpt");
const { runClaude } = require("../../src/providers/claude");
const { runSelfHosted } = require("../../src/providers/selfHosted");

// Mock fetch globally
global.fetch = jest.fn();

describe("AI Providers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockReset();
  });

  describe("runChatGPT", () => {
    it("should throw error when API key is missing", async () => {
      await expect(runChatGPT({
        apiKey: null,
        model: "gpt-4",
        prompt: "test",
        task: "review"
      })).rejects.toThrow("CHATGPT_API_KEY");
    });

    it("should make API request with correct payload", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            { message: { content: "AI response" }, finish_reason: "stop" }
          ]
        })
      });

      const result = await runChatGPT({
        apiKey: "test-key",
        model: "gpt-4o-mini",
        prompt: "Review this code",
        task: "review",
        maxTokens: 1000
      });

      expect(fetch).toHaveBeenCalledWith(
        "https://api.openai.com/v1/chat/completions",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Authorization": "Bearer test-key"
          })
        })
      );

      expect(result.provider).toBe("ChatGPT");
      expect(result.content).toBe("AI response");
    });

    it("should use json_object format for expectJson requests on supported models", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            { message: { content: '{"reviews": []}' }, finish_reason: "stop" }
          ]
        })
      });

      await runChatGPT({
        apiKey: "test-key",
        model: "gpt-4o",
        prompt: "test",
        task: "review",
        expectJson: true
      });

      const callArgs = fetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.response_format).toEqual({ type: "json_object" });
    });

    it("should handle truncated responses with length finish_reason", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            { message: { content: "Truncated" }, finish_reason: "length" }
          ]
        })
      });

      await expect(runChatGPT({
        apiKey: "test-key",
        model: "gpt-4",
        prompt: "test",
        task: "review",
        maxTokens: 100
      })).rejects.toThrow("truncated");
    });

    it("should handle API errors", async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => "Unauthorized"
      });

      await expect(runChatGPT({
        apiKey: "bad-key",
        model: "gpt-4",
        prompt: "test",
        task: "review"
      })).rejects.toThrow("401");
    });
  });

  describe("runClaude", () => {
    it("should throw error when API key is missing", async () => {
      await expect(runClaude({
        apiKey: null,
        model: "claude-3-opus",
        prompt: "test",
        task: "review"
      })).rejects.toThrow("CLAUDE_API_KEY");
    });

    it("should make API request with correct headers", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: "Claude response" }]
        })
      });

      const result = await runClaude({
        apiKey: "test-key",
        model: "claude-3-5-sonnet-20241022",
        prompt: "Review this",
        task: "review",
        maxTokens: 2000
      });

      expect(fetch).toHaveBeenCalledWith(
        "https://api.anthropic.com/v1/messages",
        expect.objectContaining({
          headers: expect.objectContaining({
            "x-api-key": "test-key",
            "anthropic-version": "2023-06-01"
          })
        })
      );

      expect(result.provider).toBe("Claude");
      expect(result.content).toBe("Claude response");
    });

    it("should use different system content for expectJson", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: '{"reviews": []}' }]
        })
      });

      await runClaude({
        apiKey: "test-key",
        model: "claude-3-opus",
        prompt: "test",
        task: "review",
        expectJson: true
      });

      const callArgs = fetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.system).toContain("structured JSON");
    });
  });

  describe("runSelfHosted", () => {
    it("should throw error when endpoint is missing", async () => {
      await expect(runSelfHosted({
        endpoint: null,
        model: "local-model",
        prompt: "test",
        task: "review"
      })).rejects.toThrow("endpoint URL is required");
    });

    it("should make request to self-hosted endpoint", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Local response" } }],
          model: "local-model"
        })
      });

      const result = await runSelfHosted({
        endpoint: "http://localhost:11434/v1/chat/completions",
        apiKey: "local-key",
        model: "llama2",
        prompt: "test",
        task: "review"
      });

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:11434/v1/chat/completions",
        expect.objectContaining({
          method: "POST"
        })
      );

      expect(result.provider).toBe("Self-Hosted");
      expect(result.content).toBe("Local response");
    });

    it("should work without API key", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Response" } }]
        })
      });

      await runSelfHosted({
        endpoint: "http://localhost:11434/v1/chat/completions",
        model: "local",
        prompt: "test",
        task: "review"
      });

      expect(fetch).toHaveBeenCalled();
    });
  });
});
