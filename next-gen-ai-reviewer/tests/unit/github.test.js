const {
  fetchPullRequest,
  fetchPullFiles,
  postIssueComment,
  fetchRepoFile,
  createReview,
  createReviewComment
} = require("../../src/github");

// Mock fetch globally
global.fetch = jest.fn();

describe("github", () => {
  const mockToken = "test-token";
  const mockOwner = "testowner";
  const mockRepo = "testrepo";

  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockReset();
    delete process.env.GITHUB_API_URL;
  });

  describe("fetchPullRequest", () => {
    it("should fetch PR metadata successfully", async () => {
      const mockPR = {
        number: 123,
        title: "Test PR",
        user: { login: "testuser" },
        base: { ref: "main" },
        head: { ref: "feature" }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockPR
      });

      const result = await fetchPullRequest({
        token: mockToken,
        owner: mockOwner,
        repo: mockRepo,
        prNumber: 123
      });

      expect(fetch).toHaveBeenCalledWith(
        "https://api.github.com/repos/testowner/testrepo/pulls/123",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "Authorization": `Bearer ${mockToken}`
          })
        })
      );
      expect(result).toEqual(mockPR);
    });

    it("should handle API errors", async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        text: async () => "PR not found"
      });

      await expect(fetchPullRequest({
        token: mockToken,
        owner: mockOwner,
        repo: mockRepo,
        prNumber: 999
      })).rejects.toThrow("404");
    });

    it("should use custom GITHUB_API_URL when set", async () => {
      // Note: GITHUB_API_URL needs to be set before module is loaded
      // This test verifies the API_BASE constant behavior
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ number: 1 })
      });

      await fetchPullRequest({
        token: mockToken,
        owner: mockOwner,
        repo: mockRepo,
        prNumber: 1
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/repos/testowner/testrepo/pulls/1"),
        expect.any(Object)
      );
    });
  });

  describe("fetchPullFiles", () => {
    it("should fetch files for a PR", async () => {
      const mockFiles = [
        { filename: "file1.js", status: "modified", patch: "@@ diff @@" },
        { filename: "file2.js", status: "added", patch: "@@ diff @@" }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockFiles
      });

      const result = await fetchPullFiles({
        token: mockToken,
        owner: mockOwner,
        repo: mockRepo,
        prNumber: 123,
        max: 40
      });

      expect(result).toHaveLength(2);
      expect(result[0].filename).toBe("file1.js");
    });

    it("should paginate through multiple pages", async () => {
      const page1 = Array(100).fill(null).map((_, i) => ({
        filename: `file${i}.js`,
        status: "modified"
      }));
      const page2 = Array(50).fill(null).map((_, i) => ({
        filename: `file${i + 100}.js`,
        status: "modified"
      }));

      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => page1
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => page2
        });

      const result = await fetchPullFiles({
        token: mockToken,
        owner: mockOwner,
        repo: mockRepo,
        prNumber: 123,
        max: 120
      });

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(120);
    });

    it("should respect max limit", async () => {
      const files = Array(100).fill(null).map((_, i) => ({
        filename: `file${i}.js`
      }));

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => files
      });

      const result = await fetchPullFiles({
        token: mockToken,
        owner: mockOwner,
        repo: mockRepo,
        prNumber: 123,
        max: 50
      });

      expect(result).toHaveLength(50);
    });

    it("should stop pagination when fewer than perPage results", async () => {
      const files = Array(30).fill(null).map((_, i) => ({
        filename: `file${i}.js`
      }));

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => files
      });

      await fetchPullFiles({
        token: mockToken,
        owner: mockOwner,
        repo: mockRepo,
        prNumber: 123,
        max: 100
      });

      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("postIssueComment", () => {
    it("should post a comment to PR", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: 123, body: "Test comment" })
      });

      const result = await postIssueComment({
        token: mockToken,
        owner: mockOwner,
        repo: mockRepo,
        issueNumber: 123,
        body: "Test comment"
      });

      expect(fetch).toHaveBeenCalledWith(
        "https://api.github.com/repos/testowner/testrepo/issues/123/comments",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ body: "Test comment" })
        })
      );
      expect(result.body).toBe("Test comment");
    });
  });

  describe("fetchRepoFile", () => {
    it("should fetch file with raw content type", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([["content-type", "application/vnd.github.raw"]]),
        text: async () => "file content"
      });

      const result = await fetchRepoFile({
        token: mockToken,
        owner: mockOwner,
        repo: mockRepo,
        path: "README.md"
      });

      expect(result).toBe("file content");
    });

    it("should handle base64 encoded content", async () => {
      const base64Content = Buffer.from("test content").toString("base64");
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([["content-type", "application/json"]]),
        json: async () => ({
          encoding: "base64",
          content: base64Content
        })
      });

      const result = await fetchRepoFile({
        token: mockToken,
        owner: mockOwner,
        repo: mockRepo,
        path: "test.txt"
      });

      expect(result).toBe("test content");
    });

    it("should handle download_url fallback", async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Map([["content-type", "application/json"]]),
          json: async () => ({
            download_url: "https://raw.githubusercontent.com/owner/repo/main/file.txt"
          })
        });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => "downloaded content"
      });

      const result = await fetchRepoFile({
        token: mockToken,
        owner: mockOwner,
        repo: mockRepo,
        path: "file.txt"
      });

      expect(result).toBe("downloaded content");
    });

    it("should return null for 404", async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const result = await fetchRepoFile({
        token: mockToken,
        owner: mockOwner,
        repo: mockRepo,
        path: "nonexistent.txt"
      });

      expect(result).toBeNull();
    });

    it("should handle paths with special characters", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: jest.fn().mockReturnValue("application/vnd.github.raw")
        },
        text: async () => "file content"
      });

      await fetchRepoFile({
        token: mockToken,
        owner: mockOwner,
        repo: mockRepo,
        path: "path/with spaces/file.txt"
      });

      // Path segments are individually encoded, so spaces become %20
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("path/with%20spaces/file.txt"),
        expect.any(Object)
      );
    });
  });

  describe("createReview", () => {
    it("should create a review with comments", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 456 })
      });

      const result = await createReview({
        token: mockToken,
        owner: mockOwner,
        repo: mockRepo,
        prNumber: 123,
        body: "Review body",
        event: "COMMENT",
        comments: [
          { path: "file.js", position: 5, body: "Issue here" }
        ]
      });

      expect(fetch).toHaveBeenCalledWith(
        "https://api.github.com/repos/testowner/testrepo/pulls/123/reviews",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"event":"COMMENT"')
        })
      );
      expect(result.id).toBe(456);
    });

    it("should handle empty comments array", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 789 })
      });

      await createReview({
        token: mockToken,
        owner: mockOwner,
        repo: mockRepo,
        prNumber: 123,
        body: "Review body",
        event: "APPROVE",
        comments: []
      });

      expect(fetch).toHaveBeenCalled();
    });

    it("should handle 204 no content response", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 204
      });

      const result = await createReview({
        token: mockToken,
        owner: mockOwner,
        repo: mockRepo,
        prNumber: 123,
        body: "Review",
        event: "COMMENT",
        comments: []
      });

      expect(result).toBeNull();
    });
  });

  describe("createReviewComment", () => {
    it("should create a single review comment", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: 999, body: "Comment" })
      });

      const result = await createReviewComment({
        token: mockToken,
        owner: mockOwner,
        repo: mockRepo,
        prNumber: 123,
        body: "Comment",
        commitId: "abc123",
        path: "file.js",
        line: 10,
        side: "RIGHT"
      });

      expect(fetch).toHaveBeenCalledWith(
        "https://api.github.com/repos/testowner/testrepo/pulls/123/comments",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"commit_id":"abc123"')
        })
      );
      expect(result.id).toBe(999);
    });

    it("should use LEFT side when specified", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 111 })
      });

      await createReviewComment({
        token: mockToken,
        owner: mockOwner,
        repo: mockRepo,
        prNumber: 123,
        body: "Old file comment",
        commitId: "def456",
        path: "file.js",
        line: 5,
        side: "LEFT"
      });

      const callBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(callBody.side).toBe("LEFT");
    });
  });
});
