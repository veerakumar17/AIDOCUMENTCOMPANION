from pymongo import MongoClient
from datetime import datetime
from typing import Optional
import os

# MongoDB connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URI)
db = client["document_companion"]
documents_collection = db["documents"]
users_collection = db["users"]

def save_document_metadata(filename: str, file_size: int, file_type: str, page_count: Optional[int] = None, user_id: Optional[str] = None):
    """Save document metadata to MongoDB"""
    metadata = {
        "filename": filename,
        "user_id": user_id or "anonymous",
        "file_size": file_size,
        "file_type": file_type,
        "page_count": page_count,
        "uploaded_at": datetime.utcnow(),
        "indexed": False
    }
    result = documents_collection.insert_one(metadata)
    return str(result.inserted_id)

def update_document_status(filename: str, indexed: bool = True):
    """Update document indexing status"""
    documents_collection.update_one(
        {"filename": filename},
        {"$set": {"indexed": indexed, "indexed_at": datetime.utcnow()}}
    )

def get_document_metadata(filename: str):
    """Retrieve document metadata"""
    return documents_collection.find_one({"filename": filename})

def get_all_documents():
    """Get all documents metadata"""
    return list(documents_collection.find().sort("uploaded_at", -1))

def delete_document_metadata(filename: str):
    """Delete document metadata"""
    documents_collection.delete_one({"filename": filename})

def create_user(username: str, hashed_password: str):
    """Create a new user"""
    user_data = {
        "username": username,
        "password": hashed_password,
        "created_at": datetime.utcnow()
    }
    result = users_collection.insert_one(user_data)
    return str(result.inserted_id)

def get_user_by_username(username: str):
    """Get user by username"""
    return users_collection.find_one({"username": username})

def get_user_documents(user_id: str):
    """Get documents for a specific user"""
    return list(documents_collection.find({"user_id": user_id}).sort("uploaded_at", -1))
