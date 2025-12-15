import faiss
import pickle
from sentence_transformers import SentenceTransformer
from local_llama import local_llama3_chat
from pathlib import Path
import re

VECTOR_STORE_PATH = "backend/vector_store"
model = SentenceTransformer('all-MiniLM-L6-v2')

def validate_file_id(file_id: str) -> str:
    safe_id = re.sub(r'[^a-zA-Z0-9_-]', '', file_id)
    if not safe_id or safe_id != file_id:
        raise ValueError("Invalid file_id: contains unsafe characters")
    return safe_id

def summarize_document(file_id: str, top_k: int = 30) -> str:
    """RAG-based document summarization"""
    safe_file_id = validate_file_id(file_id)
    
    index_path = Path(VECTOR_STORE_PATH) / f"{safe_file_id}.index"
    chunks_path = Path(VECTOR_STORE_PATH) / f"{safe_file_id}_chunks.pkl"
    
    if not str(index_path.resolve()).startswith(str(Path(VECTOR_STORE_PATH).resolve())):
        raise ValueError("Invalid file path")
    if not str(chunks_path.resolve()).startswith(str(Path(VECTOR_STORE_PATH).resolve())):
        raise ValueError("Invalid file path")

    if not index_path.exists() or not chunks_path.exists():
        return "No vector index found. Please process the file first."

    index = faiss.read_index(str(index_path))
    with open(chunks_path, "rb") as f:
        chunks = pickle.load(f)

    # Small docs: direct summarization
    if len(" ".join(chunks).split()) < 6000:
        combined = "\n".join(chunks)
        return local_llama3_chat(combined, task="summarize")

    # Large docs: map-reduce
    partial_summaries = [local_llama3_chat(chunk, task="summarize") for chunk in chunks[:top_k]]
    final_input = "\n".join(partial_summaries)
    return local_llama3_chat(final_input, task="summarize")

def retrieve_and_answer(question: str, file_id: str, top_k: int = 5) -> str:
    # Validate file_id to prevent path traversal
    safe_file_id = validate_file_id(file_id)
    
    # Load FAISS index and text chunks
    index_path = Path(VECTOR_STORE_PATH) / f"{safe_file_id}.index"
    chunks_path = Path(VECTOR_STORE_PATH) / f"{safe_file_id}_chunks.pkl"
    
    # Ensure paths are within the vector store directory
    if not str(index_path.resolve()).startswith(str(Path(VECTOR_STORE_PATH).resolve())):
        raise ValueError("Invalid file path")
    if not str(chunks_path.resolve()).startswith(str(Path(VECTOR_STORE_PATH).resolve())):
        raise ValueError("Invalid file path")

    if not index_path.exists() or not chunks_path.exists():
        return "No vector index found. Please process the file first."

    index = faiss.read_index(str(index_path))
    with open(chunks_path, "rb") as f:
        chunks = pickle.load(f)

    # Embed the question
    question_embedding = model.encode([question])

    # Search for similar chunks
    distances, indices = index.search(question_embedding, top_k)
    matched_chunks = [chunks[i] for i in indices[0] if i < len(chunks)]

    # Combine matched chunks into context
    context = "\n".join(matched_chunks)
    prompt = f"Answer the following question based on the document:\n\n{context}\n\nQuestion: {question}"

    # Ask the LLM
    response = local_llama3_chat(prompt)
    return response
