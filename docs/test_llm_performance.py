"""
LLM Performance Testing Script for Qwen3 Models
Tests three specialized models on 192.168.50.15:
- Port 8070: Qwen3-Reranker-8B (Reranking model)
- Port 8080: Qwen3-Embedding-8B (Embedding model)
- Port 8090: Qwen3-8B (Chat/Completion model)
"""

import asyncio
import aiohttp
import time
import json
import statistics
from typing import Dict, List, Tuple
from datetime import datetime
import sys
import numpy as np

# Model configurations with their specific purposes
MODELS = {
    "Qwen3_Chat": {
        "host": "192.168.50.15",
        "port": 8090,
        "model_name": "models/Qwen3-8B-Q8_0.gguf",
        "type": "chat",
        "description": "General purpose chat and completion model"
    },
    "Qwen3_Embedding": {
        "host": "192.168.50.15",
        "port": 8080,
        "model_name": "models/Qwen3-Embedding-8B-Q8_0.gguf",
        "type": "embedding",
        "description": "Text embedding model for vector representations"
    },
    "Qwen3_Reranker": {
        "host": "192.168.50.15",
        "port": 8070,
        "model_name": "models/Qwen3-Reranker-8B.Q8_0.gguf",
        "type": "reranker",
        "description": "Document reranking model for relevance scoring"
    }
}

# Generate incremental content sizes for real-world testing
def generate_text_of_tokens(base_text: str, target_tokens: int) -> str:
    """Generate text approximately matching target token count"""
    words = base_text.split()
    if not words:
        words = ["test"] * target_tokens
    
    # Rough approximation: 1 token ≈ 0.75 words
    target_words = int(target_tokens * 0.75)
    
    if len(words) >= target_words:
        return " ".join(words[:target_words])
    
    # Repeat content to reach target
    result = []
    while len(result) < target_words:
        result.extend(words)
    return " ".join(result[:target_words])

# Base content for real-world scenarios
BASE_CHAT_PROMPT = """Explain the concept of machine learning and its applications in modern technology. 
Discuss the different types of machine learning algorithms including supervised learning, unsupervised learning, 
and reinforcement learning. Provide examples of real-world applications in healthcare, finance, autonomous vehicles, 
and natural language processing. Also explain the key challenges in machine learning such as overfitting, 
underfitting, data quality issues, computational requirements, and ethical considerations."""

BASE_EMBEDDING_TEXT = """Machine learning is a subset of artificial intelligence that enables systems to learn and improve 
from experience without being explicitly programmed. It focuses on developing computer programs that can access data 
and use it to learn for themselves. The process begins with observations or data, such as examples, direct experience, 
or instruction, to look for patterns in data and make better decisions in the future. Neural networks are computing 
systems inspired by biological neural networks that constitute animal brains. Deep learning uses multiple layers to 
progressively extract higher-level features from raw input. Applications include computer vision, speech recognition, 
natural language processing, recommendation systems, and autonomous vehicles."""

BASE_RERANKER_QUERY = "Explain how machine learning algorithms work and their applications in healthcare and medical diagnosis"

BASE_RERANKER_DOCS = [
    "Machine learning algorithms in healthcare can analyze medical images like X-rays, MRIs, and CT scans to detect diseases such as cancer, pneumonia, and cardiovascular conditions with high accuracy.",
    "Deep learning models are trained on large datasets of patient records to predict disease progression, recommend personalized treatment plans, and identify potential drug interactions.",
    "Natural language processing techniques extract valuable insights from clinical notes, medical literature, and patient feedback to improve diagnosis accuracy and treatment outcomes.",
    "Computer vision applications in medical imaging help radiologists detect subtle abnormalities that might be missed by human observation alone.",
    "Predictive analytics using machine learning can forecast patient readmission risks, optimize hospital resource allocation, and reduce healthcare costs.",
    "AI-powered diagnostic tools assist physicians in making faster and more accurate diagnoses by analyzing symptoms, medical history, and test results.",
    "Machine learning models for drug discovery accelerate the identification of potential therapeutic compounds and predict their effectiveness.",
    "Healthcare chatbots and virtual assistants use NLP to provide 24/7 patient support, answer medical questions, and triage symptoms.",
    "Genomic analysis powered by machine learning helps identify genetic markers for diseases and enables personalized medicine approaches.",
    "Remote patient monitoring systems use machine learning to analyze vital signs and alert healthcare providers to potential health issues.",
]

# Token size configurations for incremental testing (realistic scenarios)
TOKEN_CONFIGS = [
    {"tokens": 128, "name": "Short", "description": "Quick question or brief text"},
    {"tokens": 512, "name": "Medium", "description": "Paragraph or moderate query"},
    {"tokens": 1024, "name": "Long", "description": "Multiple paragraphs or detailed query"},
    {"tokens": 2048, "name": "Very Long", "description": "Article or extensive content"},
    {"tokens": 4096, "name": "Extra Long", "description": "Long document or comprehensive text"},
    {"tokens": 8192, "name": "Maximum", "description": "Maximum context length test"},
]

# Generate test data for each token size
CHAT_PROMPTS = {}
EMBEDDING_TEXTS = {}
RERANKER_TESTS = {}

for config in TOKEN_CONFIGS:
    tokens = config["tokens"]
    name = config["name"]
    
    # Chat prompts
    CHAT_PROMPTS[name] = {
        "prompt": generate_text_of_tokens(BASE_CHAT_PROMPT, tokens),
        "tokens": tokens,
        "max_tokens": min(200, tokens // 4)  # Generate proportional response
    }
    
    # Embedding texts
    EMBEDDING_TEXTS[name] = {
        "text": generate_text_of_tokens(BASE_EMBEDDING_TEXT, tokens),
        "tokens": tokens
    }
    
    # Reranker tests - scale number of documents with token size
    num_docs = min(10, max(4, tokens // 512))
    RERANKER_TESTS[name] = {
        "query": generate_text_of_tokens(BASE_RERANKER_QUERY, min(128, tokens // 8)),
        "documents": [generate_text_of_tokens(doc, tokens // num_docs) for doc in BASE_RERANKER_DOCS[:num_docs]],
        "tokens": tokens,
        "num_docs": num_docs
    }


class LLMTester:
    def __init__(self):
        self.results = {model: [] for model in MODELS.keys()}
        self.concurrent_results = []

    async def check_health(self, session: aiohttp.ClientSession, model_name: str) -> bool:
        """Check if a model endpoint is accessible"""
        config = MODELS[model_name]
        url = f"http://{config['host']}:{config['port']}/api/tags"
        
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ {model_name} ({config['type']}) is accessible")
                    print(f"   {config['description']}")
                    return True
                else:
                    print(f"⚠️ {model_name} returned status {response.status}")
                    return False
        except Exception as e:
            print(f"❌ {model_name} is not accessible: {str(e)}")
            return False

    async def test_chat_model(
        self, 
        session: aiohttp.ClientSession, 
        model_name: str, 
        prompt: str,
        max_tokens: int = 200
    ) -> Dict:
        """Test the chat/completion model"""
        config = MODELS[model_name]
        url = f"http://{config['host']}:{config['port']}/v1/completions"
        
        payload = {
            "model": config['model_name'],
            "prompt": prompt,
            "max_tokens": max_tokens,
            "temperature": 0.7
        }
        
        start_time = time.time()
        error = None
        response_text = ""
        tokens_generated = 0
        tokens_per_second = 0
        
        try:
            async with session.post(
                url, 
                json=payload,
                timeout=aiohttp.ClientTimeout(total=120)
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    response_text = data['choices'][0]['text']
                    tokens_generated = data['usage']['completion_tokens']
                    
                    duration = time.time() - start_time
                    if 'timings' in data and 'predicted_per_second' in data['timings']:
                        tokens_per_second = data['timings']['predicted_per_second']
                    else:
                        tokens_per_second = tokens_generated / duration if duration > 0 else 0
                else:
                    error = f"HTTP {response.status}"
        except asyncio.TimeoutError:
            error = "Timeout"
        except Exception as e:
            error = str(e)
        
        duration = time.time() - start_time
        
        return {
            "model": model_name,
            "type": "chat",
            "prompt_length": len(prompt),
            "response_length": len(response_text),
            "tokens_generated": tokens_generated,
            "duration": duration,
            "tokens_per_second": tokens_per_second,
            "error": error,
            "timestamp": datetime.now().isoformat()
        }

    async def test_embedding_model(
        self, 
        session: aiohttp.ClientSession, 
        model_name: str, 
        text: str
    ) -> Dict:
        """Test the embedding model"""
        config = MODELS[model_name]
        url = f"http://{config['host']}:{config['port']}/v1/embeddings"
        
        payload = {
            "model": config['model_name'],
            "input": text
        }
        
        start_time = time.time()
        error = None
        embedding_dim = 0
        embedding = None
        
        try:
            async with session.post(
                url, 
                json=payload,
                timeout=aiohttp.ClientTimeout(total=60)
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    embedding = data['data'][0]['embedding']
                    embedding_dim = len(embedding)
                else:
                    error = f"HTTP {response.status}"
        except asyncio.TimeoutError:
            error = "Timeout"
        except Exception as e:
            error = str(e)
        
        duration = time.time() - start_time
        
        return {
            "model": model_name,
            "type": "embedding",
            "text_length": len(text),
            "embedding_dimension": embedding_dim,
            "duration": duration,
            "error": error,
            "embedding_sample": embedding[:10] if embedding else None,  # First 10 values
            "timestamp": datetime.now().isoformat()
        }

    async def test_reranker_model(
        self, 
        session: aiohttp.ClientSession, 
        model_name: str, 
        query: str,
        documents: List[str]
    ) -> Dict:
        """Test the reranker model"""
        config = MODELS[model_name]
        
        # Try rerank endpoint (if available)
        url = f"http://{config['host']}:{config['port']}/v1/rerank"
        
        payload = {
            "model": config['model_name'],
            "query": query,
            "documents": documents
        }
        
        start_time = time.time()
        error = None
        rankings = []
        
        try:
            async with session.post(
                url, 
                json=payload,
                timeout=aiohttp.ClientTimeout(total=60)
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    rankings = data.get('results', [])
                elif response.status == 404:
                    # Fallback: use completion endpoint for scoring
                    error = "rerank_endpoint_not_available_using_completion"
                    rankings = await self._rerank_via_completion(session, config, query, documents)
                else:
                    error = f"HTTP {response.status}"
        except asyncio.TimeoutError:
            error = "Timeout"
        except Exception as e:
            error = str(e)
            # Try fallback
            try:
                rankings = await self._rerank_via_completion(session, config, query, documents)
            except:
                pass
        
        duration = time.time() - start_time
        
        return {
            "model": model_name,
            "type": "reranker",
            "query": query,
            "num_documents": len(documents),
            "rankings": rankings,
            "duration": duration,
            "avg_time_per_doc": duration / len(documents) if documents else 0,
            "error": error,
            "timestamp": datetime.now().isoformat()
        }

    async def _rerank_via_completion(
        self,
        session: aiohttp.ClientSession,
        config: Dict,
        query: str,
        documents: List[str]
    ) -> List[Dict]:
        """Fallback method to rerank using completion endpoint"""
        url = f"http://{config['host']}:{config['port']}/v1/completions"
        rankings = []
        
        for idx, doc in enumerate(documents):
            prompt = f"Query: {query}\nDocument: {doc}\nRelevance score (0-1):"
            
            payload = {
                "model": config['model_name'],
                "prompt": prompt,
                "max_tokens": 10
            }
            
            try:
                async with session.post(
                    url,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        score_text = data['choices'][0]['text'].strip()
                        # Try to extract a number
                        try:
                            score = float(score_text.split()[0])
                        except:
                            score = 0.5  # default
                        
                        rankings.append({
                            "index": idx,
                            "document": doc,
                            "relevance_score": score
                        })
            except:
                rankings.append({
                    "index": idx,
                    "document": doc,
                    "relevance_score": 0.0
                })
        
        # Sort by relevance score
        rankings.sort(key=lambda x: x['relevance_score'], reverse=True)
        return rankings

    def analyze_results(self, results: List[Dict], test_name: str):
        """Analyze and print statistics for test results"""
        print(f"\n{'='*60}")
        print(f"Analysis: {test_name}")
        print(f"{'='*60}")
        
        if not results:
            print("No results to analyze")
            return
        
        # Group by model and type
        by_model = {}
        for result in results:
            model = result['model']
            if model not in by_model:
                by_model[model] = []
            by_model[model].append(result)
        
        # Analyze each model
        for model, model_results in by_model.items():
            successful = [r for r in model_results if not r.get('error')]
            failed = [r for r in model_results if r.get('error')]
            
            print(f"\n{model} ({MODELS[model]['type']}):")
            print(f"  Total requests: {len(model_results)}")
            print(f"  Successful: {len(successful)}")
            print(f"  Failed: {len(failed)}")
            
            if successful:
                durations = [r['duration'] for r in successful]
                
                print(f"  Response time:")
                print(f"    Min: {min(durations):.2f}s")
                print(f"    Max: {max(durations):.2f}s")
                print(f"    Avg: {statistics.mean(durations):.2f}s")
                print(f"    Median: {statistics.median(durations):.2f}s")
                
                # Model-specific metrics
                model_type = successful[0].get('type', 'unknown')
                if model_type == 'chat':
                    tokens_per_sec = [r['tokens_per_second'] for r in successful if r.get('tokens_per_second', 0) > 0]
                    if tokens_per_sec:
                        print(f"  Throughput:")
                        print(f"    Min: {min(tokens_per_sec):.2f} tokens/s")
                        print(f"    Max: {max(tokens_per_sec):.2f} tokens/s")
                        print(f"    Avg: {statistics.mean(tokens_per_sec):.2f} tokens/s")
                elif model_type == 'embedding':
                    dims = [r['embedding_dimension'] for r in successful if r.get('embedding_dimension')]
                    if dims:
                        print(f"  Embedding dimension: {dims[0]}")
                elif model_type == 'reranker':
                    num_docs = [r['num_documents'] for r in successful]
                    if num_docs:
                        print(f"  Avg documents ranked: {statistics.mean(num_docs):.1f}")
                        avg_times = [r['avg_time_per_doc'] for r in successful]
                        print(f"  Avg time per document: {statistics.mean(avg_times):.3f}s")
            
            if failed:
                error_counts = {}
                for r in failed:
                    error = r.get('error', 'Unknown')
                    error_counts[error] = error_counts.get(error, 0) + 1
                print(f"  Errors:")
                for error, count in error_counts.items():
                    print(f"    {error}: {count}")


async def main():
    print("\n" + "="*80)
    print("Qwen3 Model Suite Performance Testing - Incremental Token Testing")
    print("Testing with token sizes from 128 to 8192 tokens")
    print("Maximum 5 concurrent requests per test")
    print("="*80)
    
    tester = LLMTester()
    
    # Phase 1: Health checks
    print("\n📊 Phase 1: Health Checks")
    print("="*80)
    async with aiohttp.ClientSession() as session:
        for model_name in MODELS.keys():
            await tester.check_health(session, model_name)
    
    # Phase 2: Individual model testing - Each model with its appropriate tests
    print("\n📊 Phase 2: Individual Model Testing")
    print("="*80)
    
    async with aiohttp.ClientSession() as session:
        # Test Chat Model (Qwen3-8B)
        print("\n🤖 Testing Chat Model (Qwen3-8B)")
        print("-"*80)
        for complexity, prompt in CHAT_PROMPTS.items():
            print(f"\nTest: {complexity.upper()} complexity")
            for i in range(3):
                result = await tester.test_chat_model(session, "Qwen3_Chat", prompt)
                tester.results["Qwen3_Chat"].append(result)
                if result['error']:
                    print(f"  Run {i+1}: ❌ Error - {result['error']}")
                else:
                    print(f"  Run {i+1}: ✅ {result['duration']:.2f}s, {result['tokens_per_second']:.1f} tokens/s, {result['tokens_generated']} tokens")
                await asyncio.sleep(0.5)
        
        # Test Embedding Model (Qwen3-Embedding)
        print("\n🔢 Testing Embedding Model (Qwen3-Embedding)")
        print("-"*80)
        for text_type, text in EMBEDDING_TEXTS.items():
            print(f"\nTest: {text_type.upper()} text ({len(text)} chars)")
            for i in range(3):
                result = await tester.test_embedding_model(session, "Qwen3_Embedding", text)
                tester.results["Qwen3_Embedding"].append(result)
                if result['error']:
                    print(f"  Run {i+1}: ❌ Error - {result['error']}")
                else:
                    print(f"  Run {i+1}: ✅ {result['duration']:.2f}s, {result['embedding_dimension']}D vector")
                await asyncio.sleep(0.5)
        
        # Test Reranker Model (Qwen3-Reranker)
        print("\n📊 Testing Reranker Model (Qwen3-Reranker)")
        print("-"*80)
        for test_name, test_data in RERANKER_TESTS.items():
            print(f"\nTest: {test_name.upper()} ({len(test_data['documents'])} documents)")
            for i in range(2):
                result = await tester.test_reranker_model(
                    session, 
                    "Qwen3_Reranker",
                    test_data['query'],
                    test_data['documents']
                )
                tester.results["Qwen3_Reranker"].append(result)
                if result['error'] and not result['error'].startswith('rerank'):
                    print(f"  Run {i+1}: ❌ Error - {result['error']}")
                else:
                    print(f"  Run {i+1}: ✅ {result['duration']:.2f}s, {result['avg_time_per_doc']:.3f}s/doc")
                    if result.get('rankings'):
                        print(f"    Top result: Doc {result['rankings'][0]['index']}")
                await asyncio.sleep(0.5)
    
    # Phase 3: Concurrent testing - All models working together
    print("\n📊 Phase 3: Concurrent Testing (Simulating Real-World RAG Pipeline)")
    print("="*80)
    
    async with aiohttp.ClientSession() as session:
        print("\nScenario: Processing a query through the full pipeline")
        print("- Generate embeddings for query")
        print("- Rerank documents")
        print("- Generate response")
        
        for run in range(3):
            print(f"\n  Run {run + 1}:")
            start_time = time.time()
            
            # Execute all three models concurrently (simulating RAG pipeline)
            tasks = [
                tester.test_embedding_model(session, "Qwen3_Embedding", "What is machine learning?"),
                tester.test_reranker_model(
                    session,
                    "Qwen3_Reranker",
                    "What is machine learning?",
                    ["ML is AI subset", "Python programming", "Neural networks", "Weather forecast"]
                ),
                tester.test_chat_model(session, "Qwen3_Chat", "Explain machine learning briefly.")
            ]
            
            results = await asyncio.gather(*tasks)
            total_time = time.time() - start_time
            
            tester.concurrent_results.extend(results)
            
            errors = [r for r in results if r.get('error') and not r['error'].startswith('rerank')]
            print(f"    Total pipeline time: {total_time:.2f}s")
            print(f"    Individual times: Embed={results[0]['duration']:.2f}s, Rerank={results[1]['duration']:.2f}s, Chat={results[2]['duration']:.2f}s")
            print(f"    Errors: {len(errors)}")
            
            await asyncio.sleep(1)
    
    # Phase 4: Stress testing
    print("\n📊 Phase 4: Stress Testing (Finding Limits)")
    print("="*80)
    
    async with aiohttp.ClientSession() as session:
        for model_name, config in MODELS.items():
            print(f"\n🔥 Stress testing {model_name}")
            print("-"*80)
            
            for concurrent in [1, 3, 5, 10]:
                print(f"\n  {concurrent} concurrent requests...")
                
                # Create appropriate tasks based on model type
                if config['type'] == 'chat':
                    tasks = [
                        tester.test_chat_model(session, model_name, CHAT_PROMPTS['medium'])
                        for _ in range(concurrent)
                    ]
                elif config['type'] == 'embedding':
                    tasks = [
                        tester.test_embedding_model(session, model_name, EMBEDDING_TEXTS['medium'])
                        for _ in range(concurrent)
                    ]
                else:  # reranker
                    tasks = [
                        tester.test_reranker_model(
                            session, model_name,
                            RERANKER_TESTS['simple']['query'],
                            RERANKER_TESTS['simple']['documents']
                        )
                        for _ in range(concurrent)
                    ]
                
                start_time = time.time()
                results = await asyncio.gather(*tasks)
                total_time = time.time() - start_time
                
                successful = [r for r in results if not r.get('error') or r['error'].startswith('rerank')]
                failed = [r for r in results if r.get('error') and not r['error'].startswith('rerank')]
                
                print(f"    Success: {len(successful)}/{concurrent}, Total time: {total_time:.2f}s, Avg: {total_time/concurrent:.2f}s")
                
                if len(failed) > len(successful):
                    print(f"    ⚠️ Breaking point at {concurrent} concurrent requests")
                    break
                
                await asyncio.sleep(1)
    
    # Final analysis and summary
    print("\n" + "="*80)
    print("FINAL ANALYSIS")
    print("="*80)
    
    for model_name in MODELS.keys():
        if tester.results[model_name]:
            tester.analyze_results(tester.results[model_name], model_name)
    
    if tester.concurrent_results:
        tester.analyze_results(tester.concurrent_results, "Concurrent Pipeline Tests")
    
    # Save detailed results
    output_file = f"qwen3_test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w') as f:
        json.dump({
            "test_timestamp": datetime.now().isoformat(),
            "models_tested": {k: v for k, v in MODELS.items()},
            "individual_results": tester.results,
            "concurrent_results": tester.concurrent_results,
            "summary": {
                "total_tests": sum(len(v) for v in tester.results.values()) + len(tester.concurrent_results),
                "by_model": {
                    model: {
                        "total": len(results),
                        "successful": len([r for r in results if not r.get('error') or r['error'].startswith('rerank')]),
                        "failed": len([r for r in results if r.get('error') and not r['error'].startswith('rerank')])
                    }
                    for model, results in tester.results.items()
                }
            }
        }, f, indent=2, default=str)
    
    print(f"\n📁 Detailed results saved to: {output_file}")
    print("\n✅ Testing complete!")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️ Testing interrupted by user")
        sys.exit(0)
