module.exports = {
  fetchPullRequest: jest.fn().mockResolvedValue({}),
  fetchPullFiles: jest.fn().mockResolvedValue([]),
  postIssueComment: jest.fn().mockResolvedValue({}),
  fetchRepoFile: jest.fn().mockResolvedValue(null),
  createReview: jest.fn().mockResolvedValue({}),
  createReviewComment: jest.fn().mockResolvedValue({}),
  updatePullRequest: jest.fn().mockResolvedValue({})
};
