# query_rag.py - Python script for RAG context retrieval

import sys
import json
import os

# print(f"[Python DEBUG] Python Executable: {sys.executable}")
# print(f"[Python DEBUG] Python Path: {sys.path}")

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

if __name__ == "__main__":
    query = ""
    document_ids = []

    # Read JSON payload from environment variable
    payload_str = os.getenv("QUERY_PAYLOAD")
    if payload_str:
        try:
            payload = json.loads(payload_str)
            query = payload.get("query", "")
            document_ids = payload.get("documentIds", [])
        except json.JSONDecodeError:
            print(json.dumps({"error": "Invalid JSON payload from environment variable"}))
            sys.exit(1)
    else:
        print(json.dumps({"error": "No query payload provided in environment variable"}))
        sys.exit(1)

    if not query:
        print(json.dumps({"error": "Query is empty"}))
        sys.exit(1)

    # Paths
    PYTHON_RAG_DIR = os.path.dirname(os.path.abspath(__file__))
    FAISS_INDEX_PATH = os.path.join(PYTHON_RAG_DIR, "faiss_index_rag")

    if not os.path.exists(FAISS_INDEX_PATH):
        print(json.dumps({"error": f"Vector store not found at {FAISS_INDEX_PATH}. Please ingest documents first." }))
        sys.exit(1)

    try:
        # Load embedding model (must be the same as used in ingestion)
        embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        
        # Load FAISS index
        loaded_db = FAISS.load_local(FAISS_INDEX_PATH, embeddings, allow_dangerous_deserialization=True)

        # Perform similarity search
        # Note: documentIds are currently not used in FAISS.load_local for filtering
        # If you need to filter by documentId, you'd need a more advanced vector store (like ChromaDB)
        # or filter the results after retrieval.
        relevant_docs = loaded_db.similarity_search(query, k=5)

        context = "\n\n---\n\n".join([doc.page_content for doc in relevant_docs])

        print(json.dumps({"context": context}))

    except Exception as e:
        print(json.dumps({"error": f"Error during RAG query: {str(e)}"}))
        sys.exit(1) 