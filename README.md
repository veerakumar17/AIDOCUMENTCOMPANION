# AI Document Companion

A full-stack AI-powered document analysis application with vanilla HTML/CSS/JS frontend and FastAPI backend.

## Features

- Document upload and text extraction (PDF, DOCX, TXT, PPTX, XLSX, Images)
- AI-powered Q&A using LLaMA 3 with RAG (Retrieval Augmented Generation)
- Document summarization and translation
- Advanced image analysis with OCR (EasyOCR)
- NLP analysis (entities, sentiment, keywords, POS tagging)
- User authentication with JWT
- MongoDB integration for document metadata
- Vector search with FAISS indexing
- Real-time chat interface

## Quick Start

### Prerequisites

- Python 3.8+
- Ollama with LLaMA 3 model (for AI features)
- MongoDB (optional, for user management)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create and activate virtual environment:
```bash
python -m venv venv
venv\Scripts\activate  # Windows
# or
source venv/bin/activate  # Linux/Mac
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Start the FastAPI server:
```bash
python main.py
```

Server will be available at: http://localhost:8000

### Frontend Setup

The frontend uses vanilla HTML/CSS/JS - no build process required.

1. Open `frontend/index.html` in your browser, or
2. Serve via any web server (e.g., Python's built-in server):
```bash
cd frontend
python -m http.server 8080
```

Then open: http://localhost:8080

### AI Features Setup

For full AI functionality:

1. Install Ollama from https://ollama.ai
2. Pull LLaMA 3 model:
```bash
ollama pull llama3
```
3. Start Ollama service:
```bash
ollama serve
```

### Optional: MongoDB Setup

For user authentication and document metadata:

1. Install MongoDB
2. Start MongoDB service
3. The application will automatically connect

## Usage

1. Open the frontend in your browser
2. Register/login (if MongoDB is available)
3. Upload documents using the + button
4. Ask questions about your documents
5. Use features like summarization, translation, and analysis

## Project Structure

```
├── backend/                    # FastAPI backend
│   ├── uploads/               # Document storage
│   ├── vector_store/          # FAISS vector indices
│   ├── main.py               # Main FastAPI application
│   ├── database.py           # MongoDB operations
│   ├── text_extractor.py     # Document text extraction
│   ├── image_handler.py      # OCR and image processing
│   ├── nlp_tools.py          # NLP analysis tools
│   ├── rag_indexer.py        # RAG document indexing
│   ├── rag_retriever.py      # RAG query processing
│   ├── local_llama.py        # LLaMA integration
│   └── requirements.txt      # Python dependencies
├── frontend/                  # Vanilla HTML/CSS/JS frontend
│   ├── index.html            # Main application
│   ├── login.html            # Authentication page
│   ├── test.html             # Backend connection test
│   ├── script.js             # Application logic
│   └── style.css             # Styling
└── README.md
```

## API Endpoints

- `POST /upload` - Upload documents
- `POST /ask` - Ask questions about documents
- `POST /analyze-image` - Analyze images with OCR
- `GET /documents` - List user documents
- `POST /register` - User registration
- `POST /login` - User authentication
- `GET /healthcheck` - Check Ollama/LLaMA status

## Security Features

- JWT-based authentication
- Input sanitization and validation
- Path traversal protection
- XSS prevention
- Secure file handling
- CORS configuration
- Password hashing