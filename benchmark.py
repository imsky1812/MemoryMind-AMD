# benchmark.py

import time
import torch
from sentence_transformers import SentenceTransformer

MODEL_NAME = "BAAI/bge-small-en-v1.5"

# 100 sample chunks — realistic PDF content
SAMPLE_CHUNKS = [
    f"This is sample text chunk number {i} representing a paragraph from a PDF document. "
    f"It contains roughly the same number of tokens as a real embedded chunk in MemoryMint. "
    f"The embedding model converts this text into a 384-dimensional vector for similarity search."
    for i in range(100)
]

def benchmark(device: str) -> float:
    print(f"\n{'='*55}")
    print(f"  Benchmarking on: {device.upper()}")
    print(f"{'='*55}")

    model = SentenceTransformer(MODEL_NAME, device=device)

    # Warmup pass
    model.encode(SAMPLE_CHUNKS[:5], show_progress_bar=False)

    # Timed run
    t0 = time.perf_counter()
    embeddings = model.encode(SAMPLE_CHUNKS, batch_size=32, show_progress_bar=True)
    elapsed = time.perf_counter() - t0

    throughput = len(SAMPLE_CHUNKS) / elapsed
    ms_each = (elapsed / len(SAMPLE_CHUNKS)) * 1000

    print(f"\n  Chunks embedded : {len(SAMPLE_CHUNKS)}")
    print(f"  Total time      : {elapsed:.2f}s")
    print(f"  Throughput      : {throughput:.1f} chunks/sec")
    print(f"  Per chunk       : {ms_each:.1f} ms")
    print(f"  Vector shape    : {embeddings.shape}")

    return throughput

if __name__ == "__main__":
    print("\nMemoryMint — AMD MI300X vs CPU Embedding Benchmark")
    print(f"Model : {MODEL_NAME}")
    print(f"Chunks: {len(SAMPLE_CHUNKS)}")

    cpu_speed = benchmark("cpu")

    if torch.cuda.is_available():
        gpu_speed = benchmark("cuda")
        speedup = gpu_speed / cpu_speed

        print(f"\n{'='*55}")
        print(f"  RESULTS SUMMARY")
        print(f"{'='*55}")
        print(f"  CPU throughput  : {cpu_speed:.1f} chunks/sec")
        print(f"  AMD MI300X      : {gpu_speed:.1f} chunks/sec")
        print(f"  SPEEDUP         : {speedup:.1f}x faster on AMD MI300X")
        print(f"{'='*55}\n")
    else:
        print("\n  No AMD GPU detected. Run on AMD Developer Cloud VM.")
