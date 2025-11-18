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
        model: "gpt-5-mini",
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

    it("should handle custom header name", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Response" } }]
        })
      });

      await runSelfHosted({
        endpoint: "http://localhost:11434/v1/chat/completions",
        apiKey: "test-key",
        model: "local",
        prompt: "test",
        task: "review",
        headerName: "X-API-Key"
      });

      const callArgs = fetch.mock.calls[0][1];
      expect(callArgs.headers["X-API-Key"]).toBe("test-key");
    });

    it("should add Bearer prefix to Authorization header", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Response" } }]
        })
      });

      await runSelfHosted({
        endpoint: "http://localhost:11434/v1/chat/completions",
        apiKey: "test-key",
        model: "local",
        prompt: "test",
        task: "review",
        headerName: "Authorization"
      });

      const callArgs = fetch.mock.calls[0][1];
      expect(callArgs.headers.Authorization).toBe("Bearer test-key");
    });

    it("should not add Bearer prefix if already present", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Response" } }]
        })
      });

      await runSelfHosted({
        endpoint: "http://localhost:11434/v1/chat/completions",
        apiKey: "Bearer test-key",
        model: "local",
        prompt: "test",
        task: "review",
        headerName: "Authorization"
      });

      const callArgs = fetch.mock.calls[0][1];
      expect(callArgs.headers.Authorization).toBe("Bearer test-key");
    });

    it("should handle API errors", async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error"
      });

      await expect(runSelfHosted({
        endpoint: "http://localhost:11434/v1/chat/completions",
        model: "local",
        prompt: "test",
        task: "review"
      })).rejects.toThrow("500");
    });

    it("should handle missing content in response", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: []
        })
      });

      await expect(runSelfHosted({
        endpoint: "http://localhost:11434/v1/chat/completions",
        model: "local",
        prompt: "test",
        task: "review"
      })).rejects.toThrow("did not include any content");
    });

    it("should use expectJson for system content", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"reviews": []}' } }]
        })
      });

      await runSelfHosted({
        endpoint: "http://localhost:11434/v1/chat/completions",
        model: "local",
        prompt: "test",
        task: "review",
        expectJson: true
      });

      const callArgs = fetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.messages[0].content).toContain("structured JSON");
    });

    it("should include maxTokens when provided", async () => {
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
        task: "review",
        maxTokens: 2000
      });

      const callArgs = fetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.max_tokens).toBe(2000);
    });
  });

  describe("ChatGPT advanced features", () => {
    it("should use max_completion_tokens for gpt-4o models in auto mode", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Response" }, finish_reason: "stop" }]
        })
      });

      await runChatGPT({
        apiKey: "test-key",
        model: "gpt-4o",
        prompt: "test",
        task: "review",
        maxTokens: 1000,
        maxCompletionTokensMode: "auto"
      });

      const callArgs = fetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.max_completion_tokens).toBe(1000);
      expect(body.max_tokens).toBeUndefined();
    });

    it("should use max_tokens for older models in auto mode", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Response" }, finish_reason: "stop" }]
        })
      });

      await runChatGPT({
        apiKey: "test-key",
        model: "gpt-3.5-turbo",
        prompt: "test",
        task: "review",
        maxTokens: 1000,
        maxCompletionTokensMode: "auto"
      });

      const callArgs = fetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.max_tokens).toBe(1000);
      expect(body.max_completion_tokens).toBeUndefined();
    });

    it("should force max_completion_tokens when mode is true", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Response" }, finish_reason: "stop" }]
        })
      });

      await runChatGPT({
        apiKey: "test-key",
        model: "gpt-3.5-turbo",
        prompt: "test",
        task: "review",
        maxTokens: 1000,
        maxCompletionTokensMode: "true"
      });

      const callArgs = fetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.max_completion_tokens).toBe(1000);
      expect(body.max_tokens).toBeUndefined();
    });

    it("should force max_tokens when mode is false", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Response" }, finish_reason: "stop" }]
        })
      });

      await runChatGPT({
        apiKey: "test-key",
        model: "gpt-4o",
        prompt: "test",
        task: "review",
        maxTokens: 1000,
        maxCompletionTokensMode: "false"
      });

      const callArgs = fetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.max_tokens).toBe(1000);
      expect(body.max_completion_tokens).toBeUndefined();
    });

    it("should not set temperature for o1 models", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Response" }, finish_reason: "stop" }]
        })
      });

      await runChatGPT({
        apiKey: "test-key",
        model: "o1-preview",
        prompt: "test",
        task: "review"
      });

      const callArgs = fetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.temperature).toBeUndefined();
    });

    it("should not set temperature for gpt-5 models", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Response" }, finish_reason: "stop" }]
        })
      });

      await runChatGPT({
        apiKey: "test-key",
        model: "gpt-5-mini",
        prompt: "test",
        task: "review"
      });

      const callArgs = fetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.temperature).toBeUndefined();
    });

    it("should set temperature for regular models", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Response" }, finish_reason: "stop" }]
        })
      });

      await runChatGPT({
        apiKey: "test-key",
        model: "gpt-4",
        prompt: "test",
        task: "review"
      });

      const callArgs = fetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.temperature).toBe(0.2);
    });

    it("should handle empty content in response", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "" }, finish_reason: "stop" }]
        })
      });

      await expect(runChatGPT({
        apiKey: "test-key",
        model: "gpt-4",
        prompt: "test",
        task: "review"
      })).rejects.toThrow("ChatGPT returned empty content");
    });

    it("should handle missing choices in response", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: []
        })
      });

      await expect(runChatGPT({
        apiKey: "test-key",
        model: "gpt-4",
        prompt: "test",
        task: "review"
      })).rejects.toThrow("ChatGPT returned empty content");
    });
  });

  describe("Claude advanced features", () => {
    it("should handle missing content in response", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: []
        })
      });

      await expect(runClaude({
        apiKey: "test-key",
        model: "claude-3-opus",
        prompt: "test",
        task: "review"
      })).rejects.toThrow("did not include any content");
    });

    it("should use default max_tokens when not provided", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: "Response" }]
        })
      });

      await runClaude({
        apiKey: "test-key",
        model: "claude-3-opus",
        prompt: "test",
        task: "review"
      });

      const callArgs = fetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.max_tokens).toBe(1200);
    });

    it("should handle API errors", async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => "Rate limit exceeded"
      });

      await expect(runClaude({
        apiKey: "test-key",
        model: "claude-3-opus",
        prompt: "test",
        task: "review"
      })).rejects.toThrow("429");
    });
  });
});
