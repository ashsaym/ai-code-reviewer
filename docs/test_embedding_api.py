"""
Comprehensive LLM Embedding Performance Testing Suite
Tests batch sizes, token limits, concurrency, and finds optimal configurations.
"""
import asyncio
import httpx
import time
import statistics
from typing import List, Dict, Any, Tuple
from app.config import settings

# Try to import tiktoken for accurate token counting
try:
    import tiktoken
    TIKTOKEN_AVAILABLE = True
except ImportError:
    TIKTOKEN_AVAILABLE = False
    print("⚠️  Warning: tiktoken not available, using character-based estimation")


def estimate_tokens(text: str) -> int:
    """Estimate token count for text."""
    if TIKTOKEN_AVAILABLE:
        try:
            enc = tiktoken.get_encoding("cl100k_base")
            return len(enc.encode(text))
        except Exception:
            pass
    # Fallback: 1 token ≈ 4 characters
    return max(1, len(text) // 4)


def generate_text(token_count: int) -> str:
    """Generate text with approximately the specified token count."""
    # Average: ~5 characters per token for English text
    target_chars = token_count * 5
    base_sentence = "The quick brown fox jumps over the lazy dog. "
    repetitions = max(1, target_chars // len(base_sentence))
    return base_sentence * repetitions


class EmbeddingPerformanceTester:
    """Test embedding API performance and find optimal configurations."""
    
    def __init__(self):
        self.api_url = settings.OPENWEB_API_URL.rstrip("/")
        self.api_key = settings.OPENWEB_API_KEY
        self.model = settings.OPENWEB_EMBEDDER_MODEL
        self.headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
        self.results: List[Dict[str, Any]] = []
    
    async def test_single_request(
        self,
        texts: List[str],
        test_name: str,
        timeout: float = 120.0
    ) -> Dict[str, Any]:
        """Test a single embedding request and return metrics."""
        total_tokens = sum(estimate_tokens(t) for t in texts)
        avg_tokens = total_tokens / len(texts) if texts else 0
        
        print(f"\n{'=' * 70}")
        print(f"🧪 {test_name}")
        print(f"{'=' * 70}")
        print(f"📊 Texts: {len(texts)} | Total tokens: {total_tokens:,} | Avg tokens/text: {avg_tokens:.0f}")
        
        result = {
            'test_name': test_name,
            'num_texts': len(texts),
            'total_tokens': total_tokens,
            'avg_tokens': avg_tokens,
            'timeout': timeout,
            'success': False,
            'status_code': None,
            'elapsed_time': None,
            'throughput_texts_per_sec': None,
            'throughput_tokens_per_sec': None,
            'error': None
        }
        
        start = time.time()
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(
                    f'{self.api_url}/embeddings',
                    headers=self.headers,
                    json={'model': self.model, 'input': texts if len(texts) > 1 else texts[0]}
                )
                elapsed = time.time() - start
                result['elapsed_time'] = elapsed
                result['status_code'] = response.status_code
                
                if response.status_code == 200:
                    data = response.json()
                    embeddings_count = len(data.get('data', []))
                    embedding_dim = len(data['data'][0]['embedding']) if data.get('data') else 0
                    
                    result['success'] = True
                    result['embeddings_returned'] = embeddings_count
                    result['embedding_dimension'] = embedding_dim
                    result['throughput_texts_per_sec'] = len(texts) / elapsed
                    result['throughput_tokens_per_sec'] = total_tokens / elapsed
                    
                    print(f"✅ SUCCESS")
                    print(f"⏱️  Time: {elapsed:.2f}s")
                    print(f"📦 Embeddings: {embeddings_count} (dim: {embedding_dim})")
                    print(f"⚡ Throughput: {len(texts)/elapsed:.2f} texts/sec | {total_tokens/elapsed:.0f} tokens/sec")
                    print(f"🕐 Time per text: {elapsed/len(texts):.2f}s")
                else:
                    result['error'] = f"HTTP {response.status_code}"
                    print(f"❌ FAILED: HTTP {response.status_code}")
                    print(f"⏱️  Time: {elapsed:.2f}s")
                    print(f"📄 Response: {response.text[:300]}")
                
        except httpx.TimeoutException as e:
            elapsed = time.time() - start
            result['elapsed_time'] = elapsed
            result['error'] = 'Timeout'
            print(f"❌ TIMEOUT after {elapsed:.2f}s")
            
        except httpx.HTTPStatusError as e:
            elapsed = time.time() - start
            result['elapsed_time'] = elapsed
            result['status_code'] = e.response.status_code
            result['error'] = f"HTTP {e.response.status_code}"
            print(f"❌ HTTP ERROR: {e.response.status_code}")
            print(f"⏱️  Time: {elapsed:.2f}s")
            
        except Exception as e:
            elapsed = time.time() - start
            result['elapsed_time'] = elapsed
            result['error'] = str(e)
            print(f"❌ ERROR: {str(e)[:100]}")
            print(f"⏱️  Time: {elapsed:.2f}s")
        
        self.results.append(result)
        return result
    
    async def test_concurrent_requests(
        self,
        batch_configs: List[Tuple[str, List[str]]],
        test_name: str,
        timeout: float = 120.0
    ) -> Dict[str, Any]:
        """Test multiple concurrent requests."""
        print(f"\n{'=' * 70}")
        print(f"🚀 {test_name}")
        print(f"{'=' * 70}")
        print(f"📊 Concurrent requests: {len(batch_configs)}")
        
        start = time.time()
        tasks = [
            self._single_concurrent_request(name, texts, timeout)
            for name, texts in batch_configs
        ]
        
        try:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            elapsed = time.time() - start
            
            successes = sum(1 for r in results if isinstance(r, dict) and r.get('success'))
            failures = len(results) - successes
            
            total_texts = sum(len(texts) for _, texts in batch_configs)
            total_tokens = sum(sum(estimate_tokens(t) for t in texts) for _, texts in batch_configs)
            
            print(f"\n📈 Concurrent Test Results:")
            print(f"✅ Successful: {successes}/{len(batch_configs)}")
            print(f"❌ Failed: {failures}/{len(batch_configs)}")
            print(f"⏱️  Total time: {elapsed:.2f}s")
            print(f"⚡ Overall throughput: {total_texts/elapsed:.2f} texts/sec | {total_tokens/elapsed:.0f} tokens/sec")
            
            return {
                'test_name': test_name,
                'concurrent_requests': len(batch_configs),
                'successes': successes,
                'failures': failures,
                'total_time': elapsed,
                'total_texts': total_texts,
                'total_tokens': total_tokens,
                'throughput_texts_per_sec': total_texts / elapsed,
                'throughput_tokens_per_sec': total_tokens / elapsed,
                'results': results
            }
            
        except Exception as e:
            print(f"❌ Concurrent test failed: {e}")
            return {'test_name': test_name, 'error': str(e)}
    
    async def _single_concurrent_request(
        self,
        name: str,
        texts: List[str],
        timeout: float
    ) -> Dict[str, Any]:
        """Single request for concurrent testing."""
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(
                    f'{self.api_url}/embeddings',
                    headers=self.headers,
                    json={'model': self.model, 'input': texts if len(texts) > 1 else texts[0]}
                )
                response.raise_for_status()
                return {
                    'name': name,
                    'success': True,
                    'status': response.status_code,
                    'num_texts': len(texts)
                }
        except Exception as e:
            return {
                'name': name,
                'success': False,
                'error': str(e)[:100]
            }
    
    def print_summary(self):
        """Print comprehensive test summary with recommendations."""
        print(f"\n\n{'=' * 70}")
        print(f"📊 COMPREHENSIVE PERFORMANCE SUMMARY")
        print(f"{'=' * 70}\n")
        
        successful_tests = [r for r in self.results if r.get('success')]
        
        if not successful_tests:
            print("❌ No successful tests! Cannot determine optimal configuration.")
            return
        
        # Find metrics
        max_batch_size = max(r['num_texts'] for r in successful_tests)
        max_tokens = max(r['total_tokens'] for r in successful_tests)
        best_throughput_test = max(successful_tests, key=lambda r: r.get('throughput_tokens_per_sec', 0))
        fastest_per_text = min(successful_tests, key=lambda r: r['elapsed_time'] / r['num_texts'])
        
        avg_time_per_text = statistics.mean(
            r['elapsed_time'] / r['num_texts'] for r in successful_tests
        )
        avg_throughput = statistics.mean(
            r.get('throughput_tokens_per_sec', 0) for r in successful_tests if r.get('throughput_tokens_per_sec')
        )
        
        print("🏆 KEY FINDINGS:")
        print(f"   • Maximum batch size tested: {max_batch_size} texts")
        print(f"   • Maximum tokens processed: {max_tokens:,} tokens")
        print(f"   • Average time per text: {avg_time_per_text:.2f}s")
        print(f"   • Average throughput: {avg_throughput:.0f} tokens/sec")
        
        print(f"\n⚡ BEST PERFORMANCE:")
        print(f"   • Test: {best_throughput_test['test_name']}")
        print(f"   • Throughput: {best_throughput_test['throughput_tokens_per_sec']:.0f} tokens/sec")
        print(f"   • Batch size: {best_throughput_test['num_texts']} texts")
        print(f"   • Time: {best_throughput_test['elapsed_time']:.2f}s")
        
        print(f"\n⚡ FASTEST PER TEXT:")
        print(f"   • Test: {fastest_per_text['test_name']}")
        print(f"   • Time per text: {fastest_per_text['elapsed_time']/fastest_per_text['num_texts']:.2f}s")
        print(f"   • Batch size: {fastest_per_text['num_texts']} texts")
        
        # Recommendations
        print(f"\n💡 RECOMMENDATIONS:")
        print(f"   Based on CloudFlare timeout of ~60-100s and avg {avg_time_per_text:.1f}s per text:")
        
        safe_batch_size = int(50 / avg_time_per_text)  # Conservative for 60s timeout
        optimal_batch_size = int(80 / avg_time_per_text)  # Optimal for 100s timeout
        
        print(f"   • SAFE batch size: {safe_batch_size} texts (for 60s CloudFlare timeout)")
        print(f"   • OPTIMAL batch size: {optimal_batch_size} texts (for 100s CloudFlare timeout)")
        print(f"   • Recommended EMBEDDING_MAX_TEXTS_PER_REQUEST: {min(optimal_batch_size, max_batch_size)}")
        
        # Token limit analysis
        if max_tokens > 0:
            print(f"\n📏 TOKEN LIMITS:")
            print(f"   • Maximum tokens processed successfully: {max_tokens:,}")
            print(f"   • Model context size: {settings.OPENWEB_EMBEDDING_CONTEXT_SIZE:,}")
            if max_tokens < settings.OPENWEB_EMBEDDING_CONTEXT_SIZE:
                print(f"   • ⚠️  Limited by processing time, not token limit")
            else:
                print(f"   • ✅ Token limit is adequate")
        
        print(f"\n⚙️  RECOMMENDED CONFIG (.env):")
        print(f"   EMBEDDING_BATCH_SIZE={min(optimal_batch_size, max_batch_size)}")
        print(f"   EMBEDDING_MAX_TEXTS_PER_REQUEST={min(optimal_batch_size, max_batch_size)}")
        print(f"   MAX_CONCURRENT_EMBEDDING_REQUESTS=3")
        print(f"   EMBEDDING_BATCH_TOKEN_LIMIT=None  # Time-limited, not token-limited")


async def run_comprehensive_tests():
    """Run comprehensive embedding performance tests."""
    tester = EmbeddingPerformanceTester()
    
    print(f"\n{'=' * 70}")
    print(f"🚀 LLM EMBEDDING PERFORMANCE TEST SUITE")
    print(f"{'=' * 70}")
    print(f"API URL: {settings.OPENWEB_API_URL}")
    print(f"Model: {settings.OPENWEB_EMBEDDER_MODEL}")
    print(f"Context size: {settings.OPENWEB_EMBEDDING_CONTEXT_SIZE:,} tokens")
    print(f"Tiktoken available: {TIKTOKEN_AVAILABLE}")
    
    # Phase 1: Single text baseline tests
    print(f"\n{'#' * 70}")
    print(f"# PHASE 1: BASELINE SINGLE-TEXT TESTS")
    print(f"{'#' * 70}")
    
    await tester.test_single_request(
        [generate_text(50)],
        "Baseline: Single small text (50 tokens)"
    )
    
    await tester.test_single_request(
        [generate_text(500)],
        "Baseline: Single medium text (500 tokens)"
    )
    
    await tester.test_single_request(
        [generate_text(2000)],
        "Baseline: Single large text (2000 tokens)"
    )
    
    # Phase 2: Batch size tests
    print(f"\n{'#' * 70}")
    print(f"# PHASE 2: BATCH SIZE TESTS")
    print(f"{'#' * 70}")
    
    batch_sizes = [2, 3, 5, 8, 10, 15, 20]
    for batch_size in batch_sizes:
        texts = [generate_text(500) for _ in range(batch_size)]
        await tester.test_single_request(
            texts,
            f"Batch: {batch_size} texts × 500 tokens ({batch_size * 500:,} total tokens)",
            timeout=180.0
        )
    
    # Phase 3: Large batch tests
    print(f"\n{'#' * 70}")
    print(f"# PHASE 3: LARGE BATCH TESTS")
    print(f"{'#' * 70}")
    
    for batch_size in [25, 30, 40, 50]:
        texts = [generate_text(500) for _ in range(batch_size)]
        await tester.test_single_request(
            texts,
            f"Large batch: {batch_size} texts × 500 tokens ({batch_size * 500:,} total tokens)",
            timeout=300.0
        )
    
    # Phase 4: Token limit tests
    print(f"\n{'#' * 70}")
    print(f"# PHASE 4: TOKEN LIMIT TESTS")
    print(f"{'#' * 70}")
    
    await tester.test_single_request(
        [generate_text(8000)],
        "Token test: Single 8K token text",
        timeout=180.0
    )
    
    await tester.test_single_request(
        [generate_text(2000) for _ in range(4)],
        "Token test: 4 × 2K tokens (8K total)",
        timeout=180.0
    )
    
    # Phase 5: Concurrency tests
    print(f"\n{'#' * 70}")
    print(f"# PHASE 5: CONCURRENT REQUEST TESTS")
    print(f"{'#' * 70}")
    
    # Test 3 concurrent requests
    await tester.test_concurrent_requests(
        [
            (f"Concurrent-{i+1}", [generate_text(500) for _ in range(5)])
            for i in range(3)
        ],
        "Concurrency: 3 requests × 5 texts",
        timeout=180.0
    )
    
    # Test 5 concurrent requests
    await tester.test_concurrent_requests(
        [
            (f"Concurrent-{i+1}", [generate_text(500) for _ in range(3)])
            for i in range(5)
        ],
        "Concurrency: 5 requests × 3 texts",
        timeout=180.0
    )
    
    # Print final summary
    tester.print_summary()


if __name__ == "__main__":
    asyncio.run(run_comprehensive_tests())
