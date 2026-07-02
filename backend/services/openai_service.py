"""
services/openai_service.py — Azure OpenAI embeddings and streaming chat completions.

Uses the openai>=1.0 client pointing at Azure OpenAI endpoints.
"""
from typing import List, AsyncGenerator, Optional
import json

from openai import AsyncAzureOpenAI

from config import get_settings
from utils.logging import logger

settings = get_settings()

# Singleton async client
_client: Optional[AsyncAzureOpenAI] = None


def get_openai_client() -> AsyncAzureOpenAI:
    global _client
    if _client is None:
        _client = AsyncAzureOpenAI(
            azure_endpoint=settings.azure_openai_endpoint,
            api_key=settings.azure_openai_api_key,
            api_version=settings.azure_openai_api_version,
        )
    return _client


async def generate_embedding(text: str) -> List[float]:
    """Generate a text embedding vector using Azure OpenAI."""
    client = get_openai_client()
    response = await client.embeddings.create(
        model=settings.azure_openai_embedding_deployment,
        input=text,
    )
    return response.data[0].embedding


async def generate_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """Generate embeddings for multiple texts in one API call (more efficient)."""
    client = get_openai_client()
    response = await client.embeddings.create(
        model=settings.azure_openai_embedding_deployment,
        input=texts,
    )
    # Results are returned in the same order as input
    return [item.embedding for item in sorted(response.data, key=lambda x: x.index)]


def build_rag_prompt(query: str, context_chunks: List[dict]) -> List[dict]:
    """
    Build the messages list for RAG — system prompt + context + user question.
    The context is grounded from retrieved chunks.
    """
    if context_chunks:
        context_parts = []
        for i, chunk in enumerate(context_chunks, 1):
            doc_name = chunk.get("document_name", "Unknown")
            page = chunk.get("page_number", "?")
            content = chunk.get("content", "")
            context_parts.append(f"[Source {i}] {doc_name} (Page {page}):\n{content}")
        context_text = "\n\n---\n\n".join(context_parts)
    else:
        context_text = "No relevant documents found."

    system_message = """You are an enterprise knowledge assistant. Answer questions accurately and concisely using ONLY the provided document context below.

Rules:
- Base your answer strictly on the provided context. Do not use external knowledge.
- If the context doesn't contain enough information, say: "I don't have enough information in the provided documents to answer this question."
- Always cite your sources using [Source N] inline citations matching the context sources above.
- Format your response in clear, readable markdown.
- Be concise but thorough.

Document Context:
""" + context_text

    return [
        {"role": "system", "content": system_message},
    ]


async def stream_chat_completion(
    messages: List[dict],
    history: List[dict],
    query: str,
) -> AsyncGenerator[str, None]:
    """
    Stream a chat completion response (SSE-compatible generator).
    Yields text chunks as they arrive from the model.
    """
    client = get_openai_client()

    # Combine: system (with RAG context) + conversation history + current query
    full_messages = messages + history + [{"role": "user", "content": query}]

    stream = await client.chat.completions.create(
        model=settings.azure_openai_chat_deployment,
        messages=full_messages,
        stream=True,
        temperature=0.1,       # Low temp for factual grounded responses
        max_tokens=2048,
    )

    async for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content


async def get_chat_completion_with_usage(
    messages: List[dict],
    history: List[dict],
    query: str,
) -> dict:
    """
    Non-streaming chat completion — returns full response + token usage.
    Used for cases where streaming is not needed (e.g., content safety check on output).
    """
    client = get_openai_client()
    full_messages = messages + history + [{"role": "user", "content": query}]

    response = await client.chat.completions.create(
        model=settings.azure_openai_chat_deployment,
        messages=full_messages,
        stream=False,
        temperature=0.1,
        max_tokens=2048,
    )

    return {
        "content": response.choices[0].message.content,
        "prompt_tokens": response.usage.prompt_tokens,
        "completion_tokens": response.usage.completion_tokens,
        "total_tokens": response.usage.total_tokens,
    }
