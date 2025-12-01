"""
Open WebUI LLM Performance Testing - Incremental Token Testing
Tests three Qwen3 models via Open WebUI API with token sizes from 128 to 8192:
- Port 8070: Qwen3-Reranker-8B (Reranking model)
- Port 8080: Qwen3-Embedding-8B (Embedding model)
- Port 8090: Qwen3-8B (Chat/Completion model)

Server: 192.168.50.15
"""

import asyncio
import aiohttp
import time
import json
import statistics
from typing import Dict, List
from datetime import datetime
import sys

# Open WebUI Token
OPENWEBUI_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImRjYWJiNWY2LTc5YmEtNGZlOS1iYzFiLTA5NmQzNTkzZjdlNiIsImV4cCI6MTc2NjI2NjY3M30.6OcT3X6V3HzWy-7fuuJaiiuUFrcTdKlP5Q5y78kyQI4"

# Model configurations
MODELS = {
    "Qwen3_Chat": {
        "host": "192.168.50.15",
        "port": 8090,
        "model_name": "models/Qwen3-8B-Q8_0.gguf",
        "type": "chat"
    },
    "Qwen3_Embedding": {
        "host": "192.168.50.15",
        "port": 8080,
        "model_name": "models/Qwen3-Embedding-8B-Q8_0.gguf",
        "type": "embedding"
    },
    "Qwen3_Reranker": {
        "host": "192.168.50.15",
        "port": 8070,
        "model_name": "models/Qwen3-Reranker-8B.Q8_0.gguf",
        "type": "reranker"
    }
}

# Generate text of approximate token count
def generate_text_of_tokens(base_text: str, target_tokens: int) -> str:
    """Generate text with approximately target_tokens tokens (1 token ≈ 0.75 words)"""
    words = base_text.split()
    if not words:
        words = ["test"] * target_tokens
    target_words = int(target_tokens * 0.75)
    
    if len(words) >= target_words:
        return " ".join(words[:target_words])
    
    result = []
    while len(result) < target_words:
        result.extend(words)
    return " ".join(result[:target_words])

# Base content for realistic RAG scenario
BASE_TEXT = """Machine learning is a subset of artificial intelligence that enables systems to learn from data and improve their performance over time without being explicitly programmed. 
Neural networks are computational models inspired by the human brain, consisting of interconnected nodes called neurons that process information in layers. 
Deep learning is a specialized form of machine learning that uses multiple layers of neural networks to learn hierarchical representations of data. 
Applications of machine learning span across various domains including computer vision for image recognition, natural language processing for text understanding, speech recognition for voice interfaces, and autonomous systems for self-driving vehicles. 
Supervised learning algorithms train on labeled datasets where each input has a corresponding correct output, learning to map inputs to outputs through examples. 
Unsupervised learning discovers hidden patterns and structures in unlabeled data without predefined categories or correct answers. 
Reinforcement learning enables agents to learn optimal behaviors through trial and error interactions with an environment, receiving rewards for good actions and penalties for poor ones. 
Key challenges in machine learning include overfitting where models memorize training data rather than learning generalizable patterns, high computational requirements for training large models, data quality issues that can bias or degrade model performance, and ethical considerations around fairness, privacy, and transparency. 
Transfer learning allows models pre-trained on large datasets to be fine-tuned for specific tasks with smaller amounts of data, significantly reducing training time and resource requirements. 
Ensemble methods combine predictions from multiple models to achieve better accuracy and robustness than any single model. 
Feature engineering involves selecting, transforming, and creating input variables that make machine learning algorithms work more effectively. 
Cross-validation techniques split data into training and validation sets to assess model performance and prevent overfitting. 
Hyperparameter tuning optimizes model configuration settings that aren't learned during training, such as learning rates, network architectures, and regularization strengths. 
Model interpretability and explainability are increasingly important for understanding how models make decisions, especially in high-stakes applications like healthcare and finance. 
Distributed computing frameworks enable training of massive models across multiple GPUs and machines, handling datasets that don't fit in single-machine memory. 
Edge AI brings machine learning inference to devices like smartphones and IoT sensors, enabling real-time processing with reduced latency and improved privacy. 
Generative models like GANs and diffusion models can create new data samples that resemble training data, with applications in image synthesis, text generation, and creative tools. 
Attention mechanisms allow models to focus on relevant parts of input data, revolutionizing natural language processing with transformer architectures. 
Few-shot learning enables models to learn new tasks from just a few examples, mimicking human-like learning capabilities. 
Active learning strategies select the most informative data points for labeling, reducing annotation costs while maintaining model performance. 
Continual learning addresses the challenge of catastrophic forgetting, where models lose performance on old tasks when learning new ones. 
Privacy-preserving machine learning techniques like federated learning and differential privacy enable training on sensitive data without compromising individual privacy. 
AutoML systems automate the process of model selection, feature engineering, and hyperparameter optimization, making machine learning more accessible to non-experts."""

# Token sizes to test (128 to 8192)
TOKEN_SIZES = [128, 512, 1024, 2048, 4096, 8192]

class OpenWebUITester:
    def __init__(self, token: str):
        self.token = token
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        self.results = {model: [] for model in MODELS.keys()}
        self.concurrent_results = []
    
    async def test_chat(self, session, model_name, prompt, max_tokens=200):
        """Test chat/completion model via Open WebUI"""
        config = MODELS[model_name]
        url = f"http://{config['host']}:{config['port']}/v1/completions"
        
        start_time = time.time()
        try:
            async with session.post(
                url,
                headers=self.headers,
                json={
                    "model": config['model_name'],
                    "prompt": prompt,
                    "max_tokens": max_tokens,
                    "temperature": 0.7
                },
                timeout=aiohttp.ClientTimeout(total=180)
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    duration = time.time() - start_time
                    return {
                        "model": model_name,
                        "type": "chat",
                        "duration": duration,
                        "input_tokens": data['usage']['prompt_tokens'],
                        "output_tokens": data['usage']['completion_tokens'],
                        "tokens_per_second": data.get('timings', {}).get('predicted_per_second', 0),
                        "error": None
                    }
                else:
                    error_text = await response.text()
                    return {
                        "model": model_name,
                        "type": "chat",
                        "duration": time.time() - start_time,
                        "error": f"HTTP {response.status}: {error_text[:100]}"
                    }
        except Exception as e:
            return {
                "model": model_name,
                "type": "chat",
                "duration": time.time() - start_time,
                "error": str(e)
            }
    
    async def test_embedding(self, session, model_name, text):
        """Test embedding model via Open WebUI"""
        config = MODELS[model_name]
        url = f"http://{config['host']}:{config['port']}/v1/embeddings"
        
        start_time = time.time()
        try:
            async with session.post(
                url,
                headers=self.headers,
                json={
                    "model": config['model_name'],
                    "input": text
                },
                timeout=aiohttp.ClientTimeout(total=120)
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    duration = time.time() - start_time
                    return {
                        "model": model_name,
                        "type": "embedding",
                        "duration": duration,
                        "input_tokens": len(text.split()) * 1.33,
                        "embedding_dim": len(data['data'][0]['embedding']),
                        "error": None
                    }
                else:
                    error_text = await response.text()
                    return {
                        "model": model_name,
                        "type": "embedding",
                        "duration": time.time() - start_time,
                        "error": f"HTTP {response.status}: {error_text[:100]}"
                    }
        except Exception as e:
            return {
                "model": model_name,
                "type": "embedding",
                "duration": time.time() - start_time,
                "error": str(e)
            }
    
    async def test_reranker(self, session, model_name, query, documents):
        """Test reranker model by scoring documents via Open WebUI"""
        config = MODELS[model_name]
        url = f"http://{config['host']}:{config['port']}/v1/completions"
        
        start_time = time.time()
        scores = []
        
        for doc in documents:
            try:
                async with session.post(
                    url,
                    headers=self.headers,
                    json={
                        "model": config['model_name'],
                        "prompt": f"Query: {query}\nDocument: {doc[:200]}\nRelevance Score:",
                        "max_tokens": 5,
                        "temperature": 0.1
                    },
                    timeout=aiohttp.ClientTimeout(total=60)
                ) as response:
                    if response.status == 200:
                        scores.append(1.0)
                    else:
                        scores.append(0.0)
            except:
                scores.append(0.0)
        
        duration = time.time() - start_time
        return {
            "model": model_name,
            "type": "reranker",
            "duration": duration,
            "num_docs": len(documents),
            "avg_per_doc": duration / len(documents) if documents else 0,
            "successful": sum(scores),
            "error": None if sum(scores) > 0 else "All requests failed"
        }

async def main():
    print("\n" + "="*80)
    print("Open WebUI - Qwen3 Incremental Token Testing (128 to 8192 tokens)")
    print("Max 5 concurrent requests | Real-world RAG scenarios")
    print("Server: 192.168.50.15 | Using Open WebUI Authentication")
    print("="*80)
    
    tester = OpenWebUITester(OPENWEBUI_TOKEN)
    
    # Verify token works
    print("\n🔑 Verifying Open WebUI token...", end=" ", flush=True)
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(
                f"http://192.168.50.15:8090/api/tags",
                headers=tester.headers,
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                if response.status == 200:
                    print("✓ Token valid")
                else:
                    print(f"✗ Token validation failed: HTTP {response.status}")
                    return
        except Exception as e:
            print(f"✗ Connection failed: {e}")
            return
    
    async with aiohttp.ClientSession() as session:
        # Test each token size
        for tokens in TOKEN_SIZES:
            print(f"\n{'='*80}")
            print(f"Testing with ~{tokens} tokens")
            print(f"{'='*80}")
            
            # Generate text of target size
            text = generate_text_of_tokens(BASE_TEXT, tokens)
            max_output = min(200, tokens // 4)
            
            # Phase 1: Single Request Tests
            print(f"\n📝 Phase 1: Single Request Tests ({tokens} tokens)")
            print("-"*80)
            
            # Chat model
            print("Testing Chat model...", end=" ", flush=True)
            result = await tester.test_chat(session, "Qwen3_Chat", text, max_output)
            tester.results["Qwen3_Chat"].append(result)
            if not result['error']:
                print(f"✓ {result['duration']:.2f}s ({result['tokens_per_second']:.1f} tok/s, {result['output_tokens']} tokens)")
            else:
                print(f"✗ ERROR: {result['error']}")
            
            await asyncio.sleep(0.5)
            
            # Embedding model
            print("Testing Embedding model...", end=" ", flush=True)
            result = await tester.test_embedding(session, "Qwen3_Embedding", text)
            tester.results["Qwen3_Embedding"].append(result)
            if not result['error']:
                print(f"✓ {result['duration']:.2f}s ({result['embedding_dim']}D vector)")
            else:
                print(f"✗ ERROR: {result['error']}")
            
            await asyncio.sleep(0.5)
            
            # Reranker model
            num_docs = min(5, max(2, tokens // 512))
            docs = [text[i*len(text)//num_docs:(i+1)*len(text)//num_docs] for i in range(num_docs)]
            query = text[:min(100, len(text)//10)]
            
            print(f"Testing Reranker model ({num_docs} docs)...", end=" ", flush=True)
            result = await tester.test_reranker(session, "Qwen3_Reranker", query, docs)
            tester.results["Qwen3_Reranker"].append(result)
            if not result['error']:
                print(f"✓ {result['duration']:.2f}s ({result['avg_per_doc']:.3f}s/doc)")
            else:
                print(f"✗ ERROR: {result['error']}")
            
            await asyncio.sleep(1)
            
            # Phase 2: Concurrent Tests (only for smaller token sizes)
            if tokens <= 2048:
                for concurrent in [3, 5]:
                    print(f"\n🔄 Phase 2: {concurrent} Concurrent Requests ({tokens} tokens)")
                    print("-"*80)
                    
                    tasks = []
                    
                    # Mix of all model types
                    for i in range(concurrent):
                        if i % 3 == 0:
                            tasks.append(tester.test_chat(session, "Qwen3_Chat", text, max_output))
                        elif i % 3 == 1:
                            tasks.append(tester.test_embedding(session, "Qwen3_Embedding", text))
                        else:
                            tasks.append(tester.test_reranker(session, "Qwen3_Reranker", query, docs))
                    
                    start = time.time()
                    results = await asyncio.gather(*tasks, return_exceptions=True)
                    total = time.time() - start
                    
                    valid_results = [r for r in results if isinstance(r, dict)]
                    tester.concurrent_results.extend(valid_results)
                    
                    successful = [r for r in valid_results if not r.get('error')]
                    print(f"Completed: {len(successful)}/{concurrent} successful")
                    print(f"Total time: {total:.2f}s | Avg per request: {total/concurrent:.2f}s")
                    
                    await asyncio.sleep(2)
            
            # Phase 3: Maximum token size stress test
            if tokens == 8192:
                print(f"\n⚡ Phase 3: Stress Test at Maximum ({tokens} tokens)")
                print("-"*80)
                
                for concurrent in [1, 2, 3, 5]:
                    print(f"Testing {concurrent} concurrent requests...", end=" ", flush=True)
                    
                    tasks = [tester.test_chat(session, "Qwen3_Chat", text, max_output) for _ in range(concurrent)]
                    
                    start = time.time()
                    results = await asyncio.gather(*tasks, return_exceptions=True)
                    total = time.time() - start
                    
                    valid_results = [r for r in results if isinstance(r, dict)]
                    successful = [r for r in valid_results if not r.get('error')]
                    
                    print(f"{len(successful)}/{concurrent} OK, {total:.2f}s total, {total/concurrent:.2f}s avg")
                    
                    await asyncio.sleep(2)
            
            await asyncio.sleep(2)
    
    # Final Summary
    print("\n" + "="*80)
    print("FINAL SUMMARY - Open WebUI Tests")
    print("="*80)
    
    for model_name, results in tester.results.items():
        successful = [r for r in results if not r.get('error')]
        if successful:
            durations = [r['duration'] for r in successful]
            print(f"\n{model_name}:")
            print(f"  Success rate: {len(successful)}/{len(results)} ({100*len(successful)/len(results):.1f}%)")
            print(f"  Duration: min={min(durations):.2f}s, max={max(durations):.2f}s, avg={statistics.mean(durations):.2f}s, median={statistics.median(durations):.2f}s")
            if len(durations) > 1:
                print(f"  Std dev: {statistics.stdev(durations):.2f}s")
    
    # Concurrent performance summary
    if tester.concurrent_results:
        print(f"\nConcurrent Tests:")
        successful_concurrent = [r for r in tester.concurrent_results if not r.get('error')]
        if successful_concurrent:
            durations = [r['duration'] for r in successful_concurrent]
            print(f"  Total requests: {len(successful_concurrent)}/{len(tester.concurrent_results)}")
            print(f"  Duration: avg={statistics.mean(durations):.2f}s, median={statistics.median(durations):.2f}s")
    
    # Save results to JSON
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = f"openwebui_incremental_test_{timestamp}.json"
    
    with open(output_file, 'w') as f:
        json.dump({
            "test_date": timestamp,
            "api_type": "Open WebUI",
            "server": "192.168.50.15",
            "token_sizes": TOKEN_SIZES,
            "individual_results": tester.results,
            "concurrent_results": tester.concurrent_results,
            "summary": {
                model: {
                    "total_tests": len(results),
                    "successful": len([r for r in results if not r.get('error')]),
                    "avg_duration": statistics.mean([r['duration'] for r in results if not r.get('error')]) if any(not r.get('error') for r in results) else 0
                }
                for model, results in tester.results.items()
            }
        }, f, indent=2, default=str)
    
    print(f"\n📁 Detailed results saved to: {output_file}")
    print("="*80 + "\n")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Testing interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
