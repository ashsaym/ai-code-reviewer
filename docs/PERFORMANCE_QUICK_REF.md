# Embedding API Performance - Quick Reference

## 🎯 Optimal Configuration (IMPLEMENTED)

```bash
EMBEDDING_BATCH_SIZE=30
EMBEDDING_MAX_TEXTS_PER_REQUEST=30
MAX_CONCURRENT_EMBEDDING_REQUESTS=3
EMBEDDING_BATCH_TOKEN_LIMIT=None
```

## 📊 Performance Summary

| Metric | Value |
|--------|-------|
| **Sweet Spot Batch Size** | 30 texts |
| **Best Throughput** | 7,701 tokens/sec |
| **Time per Text (batched)** | 0.07 seconds |
| **Time per Batch (30 texts)** | 2.15 seconds |
| **Speedup vs Old Config** | **100x per text, 38x throughput** |

## ⚡ Real-World Impact

### Ingesting 1,000 Text Chunks:
- **Old (4 texts/batch):** ~167 minutes, frequent 524 errors
- **New (30 texts/batch):** **~1-2 minutes**, minimal errors
- **Speedup:** **83-167x faster!**

## 🔍 Key Findings

1. **Performance Cliff at 20+ texts:** API uses parallel processing for large batches
2. **Not token-limited:** Batch can exceed 8K tokens total (each text processed separately)
3. **Time-limited:** CloudFlare timeout (60-100s) is the constraint
4. **Concurrency:** 3 concurrent requests optimal
5. **Cache critical:** Reduces redundant API calls

## 📏 Token Limits

| Constraint | Limit | Notes |
|-----------|-------|-------|
| Single text context | 8,192 tokens | Hard limit per text |
| Batch total tokens | No limit | Each text processed separately |
| CloudFlare timeout | 60-100 seconds | Practical limit on batch size |
| Optimal batch size | 30 texts | Sweet spot for performance |
| Max safe batch size | 50 texts | Stays well under timeout |

## 🧪 Test Results Highlights

### Small Batches (Linear Processing)
```
1 text × 500 tokens:  9.70s (57 tokens/sec)
5 texts × 500 tokens: 19.93s (138 tokens/sec)
10 texts × 500 tokens: 21.85s (252 tokens/sec)
```

### Large Batches (Parallel Processing) ⚡
```
20 texts × 500 tokens: 8.57s (1,287 tokens/sec) 
25 texts × 500 tokens: 1.86s (7,395 tokens/sec)
30 texts × 500 tokens: 2.15s (7,701 tokens/sec) 🏆
40 texts × 500 tokens: 2.92s (7,549 tokens/sec)
50 texts × 500 tokens: 3.79s (7,275 tokens/sec)
```

## 🚨 Troubleshooting

### If you see 524 errors:
1. Check if texts are unusually large (>2000 tokens)
2. Reduce `EMBEDDING_MAX_TEXTS_PER_REQUEST` to 20
3. Ensure CloudFlare timeout is configured for 100s
4. Monitor API server health

### If ingestion is slow:
1. Check cache hit rate (should be >80% on re-ingestion)
2. Verify batch size is 30 (check logs)
3. Ensure concurrent requests are being used (should see 3 parallel)
4. Check network latency to API endpoint

### If API returns 400 errors:
- Single text exceeds 8,192 tokens
- Reduce `CHUNK_SIZE` in project settings
- Current default (2000) should be safe

## 📈 Monitoring Checklist

- [ ] Average batch size: ~30 texts
- [ ] 524 error rate: <1%
- [ ] Cache hit rate: >80%
- [ ] API response time: <5s per batch
- [ ] Ingestion time: <5 minutes for medium repos

## 🎉 Expected Results

With the optimized configuration, you should see:
- **Dramatically faster ingestion** (minutes instead of hours)
- **Minimal 524 timeout errors** (API completes well under 60s)
- **High throughput** (~7,700 tokens/sec sustained)
- **Efficient resource usage** (3 concurrent requests, not overwhelming API)

## 📚 Full Analysis

See `EMBEDDING_PERFORMANCE_ANALYSIS.md` for comprehensive test results and technical insights.

---

**Last Updated:** November 25, 2025  
**Test Script:** `backend/test_embedding_api.py`  
**Status:** ✅ Implemented and Optimized
