# ingest.py - Python-based RAG Ingestion System

import os
import sys # Import sys to read command-line arguments

# print(f"[Python DEBUG] Python Executable: {sys.executable}")
# print(f"[Python DEBUG] Python Path: {sys.path}")

from langchain_community.document_loaders import PyMuPDFLoader, UnstructuredWordDocumentLoader, CSVLoader, TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS # Using FAISS as the primary vector store
# from langchain_community.vectorstores import Chroma # Uncomment for ChromaDB

class DocumentIngestionPipeline:
    def __init__(self, embedding_model_name: str = "all-MiniLM-L6-v2", vector_store_path: str = "faiss_index"):
        """
        Initializes the RAG ingestion pipeline.

        Args:
            embedding_model_name (str): Name of the Sentence-Transformers model to use for embeddings.
                                        e.g., "all-MiniLM-L6-v2", "bge-base-en-v1.5"
            vector_store_path (str): Path to save the FAISS index or ChromaDB directory.
        """
        self.embedding_model_name = embedding_model_name
        self.vector_store_path = vector_store_path
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        self.embeddings = self._initialize_embeddings()

    def _initialize_embeddings(self):
        """Initializes the HuggingFaceEmbeddings model."""
        print(f"Loading embedding model: {self.embedding_model_name}")
        return HuggingFaceEmbeddings(model_name=self.embedding_model_name)

    def _get_document_loader(self, file_path: str):
        """
        Selects the appropriate document loader based on file extension.
        Relies on unstructured.io for robust text extraction.
        """
        file_extension = os.path.splitext(file_path)[1].lower()
        if file_extension == ".pdf":
            print(f"Using PyMuPDFLoader for {file_path}")
            return PyMuPDFLoader(file_path)
        elif file_extension == ".docx":
            print(f"Using UnstructuredWordDocumentLoader for {file_path}")
            return UnstructuredWordDocumentLoader(file_path)
        elif file_extension == ".csv":
            print(f"Using CSVLoader for {file_path}")
            return CSVLoader(file_path)
        elif file_extension == ".txt":
            print(f"Using TextLoader for {file_path}")
            return TextLoader(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_extension}")

    def load_documents(self, file_paths: list[str]):
        """
        Stage 1: Loads documents from the given file paths.
        """
        all_documents = []
        for file_path in file_paths:
            try:
                loader = self._get_document_loader(file_path)
                docs = loader.load()
                print(f"Loaded {len(docs)} pages/sections from {file_path}")
                all_documents.extend(docs)
            except Exception as e:
                print(f"Error loading {file_path}: {e}")
        return all_documents

    def split_texts(self, documents):
        """
        Stage 2: Splits loaded documents into smaller chunks.
        """
        print(f"Splitting {len(documents)} documents into chunks...")
        chunks = self.text_splitter.split_documents(documents)
        print(f"Generated {len(chunks)} chunks.")
        return chunks

    def embed_chunks(self, chunks):
        """
        Stage 3: Converts text chunks into vector embeddings.
        """
        print(f"Generating embeddings for {len(chunks)} chunks...")
        # Embeddings are generated when creating the vector store
        return chunks # Return chunks as they are, embedding happens in next step

    def store_vectors(self, chunks):
        """
        Stage 4: Stores the generated embeddings and chunks in a vector store.
        """
        print(f"Storing vectors in FAISS index at {self.vector_store_path}...")

        if os.path.exists(self.vector_store_path):
            print(f"Loading existing FAISS index from {self.vector_store_path}")
            existing_db = FAISS.load_local(self.vector_store_path, self.embeddings, allow_dangerous_deserialization=True)
            existing_db.add_documents(chunks)
            existing_db.save_local(self.vector_store_path)
            db = existing_db
            print("FAISS index updated and saved successfully.")
        else:
            # Create a new FAISS index from the chunks and embeddings
            db = FAISS.from_documents(chunks, self.embeddings)
            db.save_local(self.vector_store_path)
            print("New FAISS index created and saved successfully.")

        # --- For ChromaDB (Alternative Vector Store) ---
        # Uncomment the following lines if you want to use ChromaDB instead of FAISS
        # from langchain_community.vectorstores import Chroma
        # print(f"Storing vectors in ChromaDB directory: {self.vector_store_path}...")
        # db = Chroma.from_documents(chunks, self.embeddings, persist_directory=self.vector_store_path)
        # db.persist()
        # print("ChromaDB index saved successfully.")

        return db

    def ingest_documents(self, file_paths: list[str]):
        """
        Runs the full ingestion pipeline.
        """
        print("Starting document ingestion pipeline...")
        documents = self.load_documents(file_paths)
        if not documents:
            print("No documents loaded. Exiting.")
            return

        chunks = self.split_texts(documents)
        
        # Embeddings are generated implicitly when creating the FAISS/ChromaDB store
        # No need for a separate embed_chunks step that returns embedded chunks
        vector_store = self.store_vectors(chunks)
        print("Document ingestion complete!")
        return vector_store

if __name__ == "__main__":
    # Check if a file path is provided as an environment variable
    file_to_ingest = os.getenv("FILE_PATH")
    if file_to_ingest:
        file_paths = [file_to_ingest]
        print(f"Ingesting single file from environment variable: {file_to_ingest}")
    else:
        # Original example usage for multiple files or dummy data
        if not os.path.exists("data"):
            os.makedirs("data")
            with open("data/sample.txt", "w") as f:
                f.write("This is a sample text document for testing. It contains some information about RAG systems.")
            print("Created dummy data/sample.txt. Please add your own .pdf, .docx, .csv files to the 'data' directory.")
        
        sample_file_paths = [
            "data/sample.txt",
            # "data/your_document.pdf",  # Uncomment and replace with your PDF file
            # "data/your_report.docx",   # Uncomment and replace with your DOCX file
            # "data/your_data.csv",      # Uncomment and replace with your CSV file
        ]
        existing_file_paths = [f for f in sample_file_paths if os.path.exists(f)]
        file_paths = existing_file_paths

    if not file_paths:
        print("No valid files found for ingestion. Exiting.")
    else:
        # Initialize the pipeline
        pipeline = DocumentIngestionPipeline(
            embedding_model_name="all-MiniLM-L6-v2", # Or "bge-base-en-v1.5"
            vector_store_path="faiss_index_rag" # Name for your FAISS index directory
        )

        # Run the ingestion
        vector_db = pipeline.ingest_documents(file_paths)

        # You can now use vector_db for similarity search
        # For example, to load and search:
        # from langchain_community.vectorstores import FAISS
        # loaded_db = FAISS.load_local("faiss_index_rag", pipeline.embeddings, allow_dangerous_deserialization=True)
        # query = "What is RAG system?"
        # docs = loaded_db.similarity_search(query)
        # print("\n--- Search Results ---")
        # for doc in docs:
        #     print(doc.page_content)
        #     print("---") 