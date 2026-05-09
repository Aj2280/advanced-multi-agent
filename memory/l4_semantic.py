from __future__ import annotations

import hashlib
import json
import os
from dataclasses import dataclass
from time import time
from typing import Any

import chromadb
import httpx


@dataclass(frozen=True)
class SemanticHit:
    id: str
    distance: float
    content: str
    metadata: dict[str, Any]


class L4SemanticMemory:
    def __init__(self, *, persist_dir: str) -> None:
        os.makedirs(persist_dir, exist_ok=True)
        self._client = chromadb.PersistentClient(path=persist_dir)
        self._col = self._client.get_or_create_collection(
            name="events",
            metadata={"hnsw:space": "cosine"},
        )
        self._ollama_base_url = os.environ.get("OLLAMA_BASE_URL", "").strip()
        self._ollama_embed_model = os.environ.get("OLLAMA_EMBED_MODEL", "nomic-embed-text").strip()

    def _id(self, *, kind: str, content: str) -> str:
        h = hashlib.sha256(f"{kind}:{content}".encode("utf-8")).hexdigest()[:24]
        return f"evt_{h}"

    def add(self, *, kind: str, content: str, metadata: dict[str, Any]) -> str:
        doc_id = self._id(kind=kind, content=content)
        md = dict(metadata)
        md["kind"] = kind
        md["ts"] = time()
        # Always provide embeddings to avoid Chroma downloading ONNX models implicitly.
        embeddings = [self._embed(text=content)]
        self._col.upsert(
            ids=[doc_id],
            documents=[content],
            metadatas=[json.loads(json.dumps(md))],
            embeddings=embeddings,
        )
        return doc_id

    def query(self, *, text: str, limit: int = 5) -> list[SemanticHit]:
        res = self._col.query(query_embeddings=[self._embed(text=text)], n_results=limit)
        hits: list[SemanticHit] = []
        ids = (res.get("ids") or [[]])[0]
        docs = (res.get("documents") or [[]])[0]
        dists = (res.get("distances") or [[]])[0]
        mds = (res.get("metadatas") or [[]])[0]
        for i, doc, dist, md in zip(ids, docs, dists, mds, strict=False):
            hits.append(
                SemanticHit(
                    id=str(i),
                    distance=float(dist) if dist is not None else 0.0,
                    content=str(doc),
                    metadata=dict(md or {}),
                )
            )
        return hits

    def prune_old_memories(self, max_age_seconds: float) -> int:
        """
        Forgets old memories to keep the context clean (Memory Pruning).
        """
        # Query metadata for old entries
        res = self._col.get()
        ids_to_delete = []
        now = time()
        for i, md in zip(res["ids"], res["metadatas"], strict=False):
            if md and "ts" in md:
                if (now - float(md["ts"])) > max_age_seconds:
                    ids_to_delete.append(i)
        
        if ids_to_delete:
            self._col.delete(ids=ids_to_delete)
        return len(ids_to_delete)

    def _embed(self, *, text: str) -> list[float]:
        if self._ollama_base_url:
            try:
                return self._embed_ollama(text=text)
            except Exception:
                # If Ollama isn't running or doesn't support the endpoint/model, fall back locally.
                return self._embed_fallback(text=text)
        return self._embed_fallback(text=text)

    def _embed_ollama(self, *, text: str) -> list[float]:
        # Ollama embeddings endpoint: POST /api/embeddings
        url = f"{self._ollama_base_url.rstrip('/')}/api/embeddings"
        with httpx.Client(timeout=30.0) as client:
            r = client.post(url, json={"model": self._ollama_embed_model, "prompt": text})
            r.raise_for_status()
            data = r.json()
            emb = data.get("embedding")
            if not isinstance(emb, list):
                raise RuntimeError("Ollama returned invalid embedding payload")
            return [float(x) for x in emb]

    def _embed_fallback(self, *, text: str, dims: int = 256) -> list[float]:
        """
        Deterministic local embedding to keep MVP working with zero downloads.
        Not semantically great, but avoids Chroma's default ONNX download path.
        """
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        out = [0.0] * dims
        for i in range(dims):
            b = digest[i % len(digest)]
            out[i] = (b / 255.0) * 2.0 - 1.0
        return out

