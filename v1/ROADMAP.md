# 🗺️ Project Roadmap

This roadmap outlines the planned features and improvements for AI Code Reviewer. Community input is welcome!

## 🎯 Current Focus (Q4 2025)

### High Priority
- [ ] Add support for Gemini (Google AI) provider
- [ ] Implement incremental review (only review new commits since last review)
- [ ] Add multi-file context awareness (understand changes across multiple files)
- [ ] Improve comment threading on existing PR discussions
- [ ] Add configurable review severity levels (info, warning, error, critical)
- [ ] Support for reviewing specific commit ranges

### Medium Priority
- [ ] Support for Mistral AI provider
- [ ] Support for Groq API (fast inference)
- [ ] Review caching to reduce API costs and rate limits
- [ ] Integration with GitHub Copilot for enhanced suggestions
- [ ] Support for monorepo workflows with path filtering
- [ ] Add review templates for different PR types (feature, bugfix, refactor)
- [ ] Support for reviewing draft PRs differently

### Documentation & Community
- [ ] Video tutorials and demos showcasing all features
- [ ] Best practices guide for optimal AI reviews
- [ ] Provider comparison matrix (cost, speed, quality)
- [ ] Community showcase of real-world usage
- [ ] Translation support for non-English code and PRs
- [ ] Advanced examples repository with real-world scenarios

## 🚀 Upcoming (2026)

### Q1 2026
- [ ] GitHub App version (no GITHUB_TOKEN needed)
- [ ] Web dashboard for review analytics
- [ ] Team-specific review guidelines
- [ ] Integration with popular CI/CD platforms
- [ ] Support for Azure DevOps and GitLab

### Q2 2026
- [ ] AI-powered test generation suggestions
- [ ] Security vulnerability detection
- [ ] Performance impact analysis
- [ ] Cost optimization recommendations
- [ ] Multi-language support (detect language-specific issues)

### Q3 2026
- [ ] VS Code extension
- [ ] Local development mode
- [ ] Review quality scoring
- [ ] Historical trend analysis
- [ ] Custom AI model fine-tuning support

## 💡 Ideas Under Consideration

These are ideas being discussed. Want to help prioritize? [Join the discussion!](https://github.com/ashsaym/ai-code-reviewer/discussions)

**Infrastructure & Architecture:**
- Plugin system for custom review rules and analyzers
- Webhook-based deployment (no GitHub Action needed)
- Standalone CLI tool for local development
- Docker container for self-hosted deployment
- Support for reviewing commits (not just PRs)

**AI & Analysis:**
- AI-powered commit message suggestions
- Code smell detection and refactoring recommendations
- Architecture and design pattern suggestions
- Performance impact prediction
- Technical debt identification
- Automated test case generation suggestions

**Integrations:**
- Slack/Teams/Discord notifications
- Jira/Linear/Asana integration for issue tracking
- IDE extensions (VS Code, JetBrains)
- Azure DevOps support
- GitLab CI/CD support
- Bitbucket Pipelines support

**Quality & Compliance:**
- Accessibility and inclusive language checks
- License compliance checking
- GDPR/Privacy compliance suggestions
- SOC2/ISO27001 compliance hints
- Code documentation coverage analysis
- API versioning compatibility checks

**Developer Experience:**
- Review diff preview before posting
- Interactive mode for iterative refinement
- Custom review checklist templates
- Review quality scoring and metrics
- A/B testing for different AI models
- Cost estimation and optimization tools

## 📊 Completed

### v1.1.0 (November 2025) - Current
**Features:**
- ✅ Multi-provider support (ChatGPT, Claude, Self-hosted/Open WebUI)
- ✅ Multiple task modes (review, summary, suggestions, description)
- ✅ GitHub-style inline review comments with position-based commenting
- ✅ Repository guidance file loading (.github/review-*.md, prompts/)
- ✅ Slash command support (/review, /summary, /suggestion, /description)
- ✅ Custom reviewer name configuration
- ✅ Auto-detection of max_completion_tokens vs max_tokens for ChatGPT
- ✅ Multi-provider fallback mechanism (try multiple providers in order)

**Quality & Testing:**
- ✅ Comprehensive test coverage increased to 78%+ (168 tests)
- ✅ Unit tests for all core modules
- ✅ Integration test structure
- ✅ ESLint configuration for code quality
- ✅ Coverage reporting with Codecov

**Security:**
- ✅ CodeQL security scanning
- ✅ Trivy dependency scanning
- ✅ Gitleaks secret scanning
- ✅ Dependency review workflow
- ✅ Minimal required permissions

**Documentation:**
- ✅ Production-ready example workflows (OpenAI, Claude, Self-hosted)
- ✅ Comprehensive examples README with quick start guides
- ✅ Advanced configuration patterns documented
- ✅ Troubleshooting section for common issues

**Developer Experience:**
- ✅ Improved error handling and logging
- ✅ Better validation of review comments against diffs
- ✅ Enhanced JSON parsing with fence removal
- ✅ Detailed inline documentation

### v1.0.0 (November 2025)
- ✅ Initial stable release with multi-provider support
- ✅ ChatGPT, Claude, and self-hosted model integration
- ✅ Pull request review functionality
- ✅ GitHub Action deployment
- ✅ Basic documentation and examples
- ✅ Test suite with Jest
- ✅ CI/CD pipeline

### v0.1.0 (Early Development)
- ✅ Proof of concept
- ✅ Basic ChatGPT integration
- ✅ Simple PR review capability

## 🤝 How to Contribute

Want to help shape the future of AI Code Reviewer?

1. **💬 Discuss**: Share your ideas in [GitHub Discussions](https://github.com/ashsaym/ai-code-reviewer/discussions)
2. **🗳️ Vote**: React with 👍 on issues you'd like to see prioritized
3. **🔨 Build**: Pick an item from the roadmap and submit a PR
4. **📝 Document**: Help improve documentation and examples
5. **🐛 Report**: Found a bug? Open an issue

## 📅 Release Cadence

- **Major releases** (vX.0.0): Quarterly
- **Minor releases** (vX.X.0): Monthly
- **Patch releases** (vX.X.X): As needed for bug fixes

---

*Last updated: November 17, 2025*

> This roadmap is subject to change based on community feedback and priorities. 
> Star ⭐ the repo to stay updated!
