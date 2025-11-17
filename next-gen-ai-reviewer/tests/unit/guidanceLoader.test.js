const {
  loadGuidance,
  filterFilesByPatterns
} = require("../../src/guidanceLoader");
const { fetchRepoFile } = require("../../src/github");

jest.mock("../../src/github");

describe("guidanceLoader", () => {
  const mockToken = "test-token";
  const mockOwner = "testowner";
  const mockRepo = "testrepo";

  beforeEach(() => {
    jest.clearAllMocks();
    fetchRepoFile.mockResolvedValue(null);
  });

  describe("loadGuidance", () => {
    it("should load all guidance files when available", async () => {
      fetchRepoFile
        .mockResolvedValueOnce("# Review Instructions\nCheck for bugs")
        .mockResolvedValueOnce("# Rulesets\nFollow style guide")
        .mockResolvedValueOnce("node_modules/\n*.log\n# comment")
        .mockResolvedValueOnce("Custom review prompt: {{taskFocus}}")
        .mockResolvedValueOnce("Custom summary prompt")
        .mockResolvedValueOnce("Custom suggestions prompt");

      const result = await loadGuidance({
        token: mockToken,
        owner: mockOwner,
        repo: mockRepo
      });

      expect(result.instructions).toBe("# Review Instructions\nCheck for bugs");
      expect(result.rulesets).toBe("# Rulesets\nFollow style guide");
      expect(result.ignorePatterns).toEqual(["node_modules/", "*.log"]);
      expect(result.prompts.review).toBe("Custom review prompt: {{taskFocus}}");
      expect(result.prompts.summary).toBe("Custom summary prompt");
      expect(result.prompts.suggestions).toBe("Custom suggestions prompt");
    });

    it("should handle missing guidance files gracefully", async () => {
      fetchRepoFile.mockResolvedValue(null);

      const result = await loadGuidance({
        token: mockToken,
        owner: mockOwner,
        repo: mockRepo
      });

      expect(result.instructions).toBe("");
      expect(result.rulesets).toBe("");
      expect(result.ignorePatterns).toEqual([]);
      expect(result.prompts).toEqual({
        review: "",
        summary: "",
        suggestions: ""
      });
    });

    it("should sanitize guidance text (remove BOM)", async () => {
      fetchRepoFile
        .mockResolvedValueOnce("\uFEFF# Instructions\nContent")
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const result = await loadGuidance({
        token: mockToken,
        owner: mockOwner,
        repo: mockRepo
      });

      expect(result.instructions).toBe("# Instructions\nContent");
    });

    it("should parse ignore list correctly", async () => {
      fetchRepoFile
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce("# Comment line\nnode_modules/\n\n  dist/  \n# Another comment\n*.log")
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const result = await loadGuidance({
        token: mockToken,
        owner: mockOwner,
        repo: mockRepo
      });

      expect(result.ignorePatterns).toEqual(["node_modules/", "dist/", "*.log"]);
    });

    it("should handle empty ignore list", async () => {
      fetchRepoFile
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce("")
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const result = await loadGuidance({
        token: mockToken,
        owner: mockOwner,
        repo: mockRepo
      });

      expect(result.ignorePatterns).toEqual([]);
    });
  });

  describe("filterFilesByPatterns", () => {
    const mockFiles = [
      { filename: "src/index.js" },
      { filename: "src/utils/helper.js" },
      { filename: "node_modules/package/index.js" },
      { filename: "dist/bundle.js" },
      { filename: "test.log" },
      { filename: "README.md" },
      { filename: ".github/workflows/test.yml" }
    ];

    it("should return all files when no patterns provided", () => {
      const result = filterFilesByPatterns(mockFiles, []);

      expect(result.filtered).toHaveLength(7);
      expect(result.ignored).toHaveLength(0);
    });

    it("should filter files by exact match pattern", () => {
      const result = filterFilesByPatterns(mockFiles, ["README.md"]);

      expect(result.filtered).toHaveLength(6);
      expect(result.ignored).toHaveLength(1);
      expect(result.ignored[0].filename).toBe("README.md");
    });

    it("should filter files by wildcard pattern", () => {
      const result = filterFilesByPatterns(mockFiles, ["*.log"]);

      expect(result.filtered).toHaveLength(6);
      expect(result.ignored).toHaveLength(1);
      expect(result.ignored[0].filename).toBe("test.log");
    });

    it("should filter files by directory pattern", () => {
      const result = filterFilesByPatterns(mockFiles, ["dist/*"]);

      expect(result.filtered).toHaveLength(6);
      expect(result.ignored).toHaveLength(1);
      expect(result.ignored[0].filename).toBe("dist/bundle.js");
    });

    it("should filter files by double-star pattern", () => {
      const result = filterFilesByPatterns(mockFiles, ["node_modules/**"]);

      expect(result.filtered).toHaveLength(6);
      expect(result.ignored).toHaveLength(1);
    });

    it("should filter files by multiple patterns", () => {
      const result = filterFilesByPatterns(mockFiles, [
        "node_modules/**",
        "dist/**",
        "*.log"
      ]);

      expect(result.filtered).toHaveLength(4);
      expect(result.ignored).toHaveLength(3);
    });

    it("should handle complex glob patterns", () => {
      const result = filterFilesByPatterns(mockFiles, [".github/**/*.yml"]);

      expect(result.filtered).toHaveLength(6);
      expect(result.ignored).toHaveLength(1);
      expect(result.ignored[0].filename).toBe(".github/workflows/test.yml");
    });

    it("should handle patterns with special regex characters", () => {
      const filesWithSpecial = [
        { filename: "file.test.js" },
        { filename: "file-test.js" },
        { filename: "file+test.js" }
      ];

      const result = filterFilesByPatterns(filesWithSpecial, ["file.test.js"]);

      expect(result.filtered).toHaveLength(2);
      expect(result.ignored).toHaveLength(1);
      expect(result.ignored[0].filename).toBe("file.test.js");
    });

    it("should handle empty patterns array", () => {
      const result = filterFilesByPatterns(mockFiles, []);

      expect(result.filtered).toEqual(mockFiles);
      expect(result.ignored).toEqual([]);
    });

    it("should handle empty files array", () => {
      const result = filterFilesByPatterns([], ["*.log"]);

      expect(result.filtered).toEqual([]);
      expect(result.ignored).toEqual([]);
    });

    it("should handle src directory pattern", () => {
      const result = filterFilesByPatterns(mockFiles, ["src/**"]);

      expect(result.filtered).toHaveLength(5);
      expect(result.ignored).toHaveLength(2);
      expect(result.ignored.map(f => f.filename)).toEqual([
        "src/index.js",
        "src/utils/helper.js"
      ]);
    });
  });
});
