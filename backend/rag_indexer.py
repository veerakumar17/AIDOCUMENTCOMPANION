from sentence_transformers import SentenceTransformer
import faiss
import os
import pickle
from typing import List
from pathlib import Path
import re

# Load a small CPU-friendly embedding model (you can change this)
model = SentenceTransformer('all-MiniLM-L6-v2')

# Where to store the vector DB and metadata
VECTOR_STORE_PATH = "backend/vector_store"
Path(VECTOR_STORE_PATH).mkdir(exist_ok=True, parents=True)

# Chunking function: you can replace with smart chunking later
def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> List[str]:
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk = words[i:i + chunk_size]
        chunks.append(" ".join(chunk))
    return chunks

def validate_file_id(file_id: str) -> str:
    # Remove any path traversal attempts and keep only alphanumeric, dash, underscore
    safe_id = re.sub(r'[^a-zA-Z0-9_-]', '', file_id)
    if not safe_id or safe_id != file_id:
        raise ValueError("Invalid file_id: contains unsafe characters")
    return safe_id

def index_document(text: str, file_id: str):
    # Validate file_id to prevent path traversal
    safe_file_id = validate_file_id(file_id)
    
    # Step 1: Chunk
    chunks = chunk_text(text)

    # Step 2: Embed
    embeddings = model.encode(chunks, convert_to_numpy=True)

    # Step 3: Create FAISS index
    dim = embeddings.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(embeddings)

    # Step 4: Save FAISS index + metadata
    index_path = Path(VECTOR_STORE_PATH) / f"{safe_file_id}.index"
    chunks_path = Path(VECTOR_STORE_PATH) / f"{safe_file_id}_chunks.pkl"
    
    faiss.write_index(index, str(index_path))
    with open(chunks_path, "wb") as f:
        pickle.dump(chunks, f)

    print(f"Indexed {len(chunks)} chunks for file: {safe_file_id}")


