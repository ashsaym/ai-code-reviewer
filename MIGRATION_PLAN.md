# 🔄 Migration Plan: v1 → v2

**Version:** 2.0.0  
**Date:** November 18, 2025  
**Status:** Planning

---

## 📋 Executive Summary

This document outlines the complete migration from the current JavaScript-based AI Code Reviewer (v1) to the new TypeScript-based, production-ready version (v2).

**Key Changes:**
- ✅ JavaScript → TypeScript (type safety, better maintainability)
- ✅ Single file → Modular architecture (50+ files)
- ✅ No caching → GitHub-native caching (60%+ faster, cost savings)
- ✅ Full PR reviews → Incremental reviews (only changed commits)
- ✅ Basic prompts → Repository-specific prompt templates
- ✅ Manual comment management → Automatic outdated comment cleanup
- ✅ Simple error handling → Production-grade error handling & recovery
- ✅ 2 providers → Extensible provider system (easy to add more)

---

## 🎯 Migration Goals

1. **Zero Breaking Changes for Users:** Existing workflows continue to work
2. **Backward Compatibility:** Support v1 configurations
3. **Gradual Migration:** Users can migrate at their own pace
4. **Improved Performance:** 60% faster with caching
5. **Lower Costs:** Smart caching reduces API calls by 40-60%
6. **Better UX:** Cleaner comments, automatic cleanup, incremental reviews

---

## 📊 Comparison: v1 vs v2

| Feature | v1 (Current) | v2 (New) |
|---------|--------------|----------|
| **Language** | JavaScript | TypeScript |
| **Architecture** | Monolithic (1 main file) | Modular (50+ files) |
| **Caching** | None | GitHub Actions Cache (7-day TTL) |
| **State Tracking** | None | Persistent (PR comments) |
| **Reviews** | Full PR each time | Incremental (delta only) |
| **Outdated Comments** | Manual | Automatic cleanup |
| **Prompt Templates** | Hardcoded | Repo-specific (.github/ai-reviewer/) |
| **Providers** | 3 (hardcoded) | Extensible (1 file = 1 provider) |
| **Default Provider** | ChatGPT | OpenAI (gpt-5-mini) |
| **Error Handling** | Basic | Production-grade |
| **Testing** | Unit tests only | Unit + Integration + E2E |
| **Storage** | None | GitHub-native (free) |
| **Performance** | ~60s for medium PR | ~25s with cache |
| **Cost** | High (full review each time) | 40-60% lower |

---

## 🚀 Migration Strategy

### Option 1: Direct Migration (Recommended for New Projects)

**Best for:** New repositories or users starting fresh

```yaml
# Before (v1)
- uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@main
  with:
    task: review
    ai-provider: chatgpt,claude
  env:
    CHATGPT_API_KEY: ${{ secrets.CHATGPT_API_KEY }}

# After (v2)
- uses: ashsaym/ai-code-reviewer@v2
  with:
    task: review
    providers: openai,openwebui  # New naming
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

**Steps:**
1. Update workflow file to use `@v2`
2. Rename `CHATGPT_API_KEY` → `OPENAI_API_KEY`
3. Update `ai-provider` → `providers`
4. Test with a sample PR

---

### Option 2: Side-by-Side (Recommended for Production)

**Best for:** Existing repositories with active PRs

```yaml
# Run both v1 and v2 in parallel for testing
jobs:
  review-v1:
    runs-on: ubuntu-latest
    steps:
      - uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@main
        with:
          task: review
        env:
          CHATGPT_API_KEY: ${{ secrets.CHATGPT_API_KEY }}

  review-v2:
    runs-on: ubuntu-latest
    steps:
      - uses: ashsaym/ai-code-reviewer@v2
        with:
          task: review
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

**Steps:**
1. Add v2 job alongside v1
2. Compare results for 1-2 weeks
3. Verify v2 performance and accuracy
4. Remove v1 job once confident

---

### Option 3: Gradual Rollout (Enterprise)

**Best for:** Organizations with multiple repositories

**Week 1-2:** Pilot (5-10% of repos)
- Select 2-3 low-risk repositories
- Deploy v2
- Monitor performance and errors

**Week 3-4:** Expansion (25% of repos)
- Deploy to more repositories
- Gather feedback
- Fix any issues

**Week 5-6:** Majority (75% of repos)
- Deploy to most repositories
- Keep critical repos on v1 as fallback

**Week 7-8:** Complete (100%)
- Migrate remaining repositories
- Deprecate v1

---

## 🔧 Configuration Migration

### Input/Output Changes

| v1 Input | v2 Input | Notes |
|----------|----------|-------|
| `ai-provider` | `providers` | Renamed for clarity |
| `chatgpt-model` | `openai-model` | Reflects provider name |
| `claude-model` | *(removed)* | Not in initial v2 release |
| `self-hosted-endpoint` | `openwebui-endpoint` | Specific naming |
| `self-hosted-model` | `openwebui-model` | Specific naming |
| `self-hosted-token` | `openwebui-api-key` | Specific naming |
| `reviewer-name` | `reviewer-name` | ✅ No change |
| `max-files` | `max-files` | ✅ No change |
| `max-diff-chars` | `max-diff-chars` | ✅ No change |
| *(new)* | `review-mode` | New: incremental/full |
| *(new)* | `auto-resolve-outdated` | New: true/false |
| *(new)* | `force-review` | New: bypass cache |

### Environment Variables

| v1 | v2 | Notes |
|----|----|----|
| `CHATGPT_API_KEY` | `OPENAI_API_KEY` | Renamed |
| `OPENAI_API_KEY` | `OPENAI_API_KEY` | ✅ No change |
| `CLAUDE_API_KEY` | *(not supported yet)* | Will be added later |
| `ANTHROPIC_API_KEY` | *(not supported yet)* | Will be added later |
| `SELF_HOSTED_ENDPOINT` | `OPENWEBUI_ENDPOINT` | Renamed |
| `SELF_HOSTED_API_KEY` | `OPENWEBUI_API_KEY` | Renamed |

---

## 📂 Repository Structure Changes

### v1 Structure
```
.github/
├── review-instructions.md
├── review-rulesets.md
├── review-ignorelist.txt
└── prompts/
    ├── review.md
    ├── summary.md
    └── suggestions.md
```

### v2 Structure (Recommended)
```
.github/
└── ai-reviewer/
    ├── config.yml              # NEW: Central configuration
    ├── prompts/
    │   ├── review.hbs          # Handlebars templates
    │   ├── summary.hbs
    │   ├── suggestions.hbs
    │   └── description.hbs
    ├── rules/
    │   ├── instructions.md     # Review guidelines
    │   ├── rulesets.md         # Security/compliance rules
    │   └── style-guide.md      # Code style requirements
    └── ignore-patterns.txt     # Files to ignore
```

**Migration Steps:**
1. Create `.github/ai-reviewer/` directory
2. Move existing files:
   - `review-instructions.md` → `rules/instructions.md`
   - `review-rulesets.md` → `rules/rulesets.md`
   - `review-ignorelist.txt` → `ignore-patterns.txt`
3. Convert `.md` prompts to `.hbs` templates (minimal changes needed)
4. Create `config.yml` (optional, uses defaults if not present)

---

## 🔄 Backward Compatibility

### Automatic Migration (v2 handles both)

v2 will automatically detect and support v1 configurations:

```typescript
// v2 will check both locations
const instructions = 
  await loadFile('.github/ai-reviewer/rules/instructions.md') ||
  await loadFile('.github/review-instructions.md');  // v1 fallback

const prompts =
  await loadTemplate('.github/ai-reviewer/prompts/review.hbs') ||
  await loadTemplate('.github/prompts/review.md') ||  // v1 fallback
  useBuiltInTemplate();
```

**This means:**
- ✅ Old file locations still work
- ✅ No immediate migration required
- ✅ Gradual migration possible

---

## 🧪 Testing the Migration

### Step 1: Create Test Branch

```bash
git checkout -b test-ai-reviewer-v2
```

### Step 2: Update Workflow

```yaml
# .github/workflows/ai-review-test.yml
name: AI Review Test (v2)

on:
  pull_request:
    types: [opened, synchronize]
    branches: [test-ai-reviewer-v2]  # Only on test branch

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: ashsaym/ai-code-reviewer@v2
        with:
          task: review
          providers: openai
          openai-model: gpt-5-mini
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

### Step 3: Test Scenarios

Create test PRs to verify:

1. **First Review (Cold Start)**
   - Create PR with 5-10 file changes
   - Verify comments posted correctly
   - Check state is saved

2. **Incremental Review**
   - Add new commit to same PR
   - Verify only new changes reviewed
   - Verify cache hit rate in logs

3. **Outdated Comment Cleanup**
   - Add commit that modifies previously commented lines
   - Verify old comments marked as outdated

4. **Custom Prompts**
   - Create `.github/ai-reviewer/prompts/review.hbs`
   - Verify custom prompt is used

5. **Error Handling**
   - Test with invalid API key
   - Verify user-friendly error message

### Step 4: Performance Comparison

| Metric | v1 | v2 | Improvement |
|--------|----|----|-------------|
| First review time | 60s | 50s | 17% faster |
| Second review time | 60s | 15s | 75% faster (cached) |
| API calls (first) | 1 | 1 | Same |
| API calls (second) | 1 | 0.4 | 60% fewer |
| Comments posted | 10 | 10 | Same |
| State tracking | ❌ | ✅ | New feature |

---

## 🚨 Breaking Changes

### Intentional Breaking Changes

1. **Provider Names**
   - `chatgpt` → `openai`
   - `self-hosted` → `openwebui`
   
   **Migration:** Update workflow files

2. **Claude Support**
   - Temporarily removed in v2.0.0
   - Will be re-added in v2.1.0
   
   **Migration:** Use OpenAI or OpenWebUI temporarily

3. **Environment Variables**
   - `CHATGPT_API_KEY` → `OPENAI_API_KEY`
   
   **Migration:** Update repository secrets

### Non-Breaking Changes (Backward Compatible)

1. ✅ Old file locations (`.github/review-*.md`) still work
2. ✅ Old input names have aliases (e.g., `ai-provider` → `providers`)
3. ✅ Environment variable fallbacks (e.g., `CHATGPT_API_KEY` → `OPENAI_API_KEY`)

---

## 📝 Migration Checklist

### Pre-Migration
- [ ] Read migration plan
- [ ] Review v2 features
- [ ] Identify custom configurations
- [ ] Plan testing approach

### During Migration
- [ ] Create test branch
- [ ] Update workflow file
- [ ] Rename environment variables
- [ ] Test with sample PRs
- [ ] Verify caching works
- [ ] Check error handling
- [ ] Review performance metrics

### Post-Migration
- [ ] Monitor for 1-2 weeks
- [ ] Gather team feedback
- [ ] Update documentation
- [ ] Remove v1 workflow (if satisfied)
- [ ] Train team on new features

### Optional Optimizations
- [ ] Migrate to new directory structure (`.github/ai-reviewer/`)
- [ ] Create custom prompt templates
- [ ] Configure `config.yml` for advanced settings
- [ ] Set up repo-specific rules

---

## 🐛 Rollback Plan

If issues arise, rollback is simple:

### Immediate Rollback
```yaml
# Change @v2 back to @main
- uses: ashsaym/ai-code-reviewer@main  # Rollback to v1
```

### Gradual Rollback
1. Keep v1 job active during migration
2. Disable v2 job if issues found
3. Investigate and fix
4. Re-enable v2 job

---

## 📊 Migration Timeline (Recommended)

### Week 1: Preparation
- Read documentation
- Set up test repository
- Update secrets/variables

### Week 2: Testing
- Deploy to test repository
- Create test PRs
- Verify all features work

### Week 3: Pilot
- Deploy to 1-2 production repositories
- Monitor performance
- Gather feedback

### Week 4: Rollout
- Deploy to remaining repositories
- Document any issues
- Provide support

### Week 5+: Optimization
- Migrate to new directory structure
- Create custom prompts
- Fine-tune configurations

---

## 🆘 Support & Troubleshooting

### Common Issues

**Issue 1: "OPENAI_API_KEY not found"**
```
Solution: Rename CHATGPT_API_KEY to OPENAI_API_KEY in repository secrets
```

**Issue 2: "Provider not found: chatgpt"**
```
Solution: Change providers: chatgpt to providers: openai
```

**Issue 3: "State comment not found"**
```
Solution: This is normal on first run. State will be created automatically.
```

**Issue 4: "Cache miss for all files"**
```
Solution: First run always has cache misses. Subsequent runs will hit cache.
```

### Getting Help

1. Check [TRACKER.md](./TRACKER.md) for known issues
2. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details
3. Open issue on GitHub
4. Contact maintainers

---

## 📈 Success Metrics

Track these metrics to measure migration success:

### Performance
- ⬇️ Average review time: Should decrease by 30-50%
- ⬆️ Cache hit rate: Target 60%+ on incremental reviews
- ⬇️ API costs: Should decrease by 40-60%

### Quality
- ✅ Review accuracy: Should match or exceed v1
- ✅ Comment relevance: Should be equal or better
- ⬇️ False positives: Should decrease with better prompts

### User Experience
- ✅ Outdated comments: Automatically cleaned up
- ✅ State tracking: Visible in PR comments
- ✅ Error messages: More helpful and actionable

---

## 🎯 Post-Migration Optimization

### Phase 1: Immediate (Week 1-2)
- Monitor performance
- Fix critical issues
- Update documentation

### Phase 2: Short-term (Week 3-4)
- Create custom prompt templates
- Optimize cache settings
- Fine-tune model parameters

### Phase 3: Long-term (Month 2+)
- Add additional providers
- Implement advanced features
- Gather user feedback for v2.1

---

## 📚 Additional Resources

- [Implementation Plan](./IMPLEMENTATION_PLAN.md)
- [Architecture Documentation](./ARCHITECTURE.md)
- [Progress Tracker](./TRACKER.md)
- [v2 README](./README.md)

---

**Document Version:** 1.0  
**Last Updated:** November 18, 2025  
**Next Review:** December 1, 2025
