from __future__ import annotations

import json
import os
import re
import sqlite3
from dataclasses import dataclass
from time import time
from typing import Any


@dataclass(frozen=True)
class EpisodicRow:
    id: int
    ts: float
    kind: str
    content: str
    metadata: dict[str, Any]


class L3EpisodicMemory:
    def __init__(self, *, sqlite_path: str) -> None:
        os.makedirs(os.path.dirname(sqlite_path) or ".", exist_ok=True)
        self._conn = sqlite3.connect(sqlite_path)
        self._conn.execute("PRAGMA journal_mode=WAL;")
        self._ensure_schema()

    def _ensure_schema(self) -> None:
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS events (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              ts REAL NOT NULL,
              kind TEXT NOT NULL,
              content TEXT NOT NULL,
              metadata_json TEXT NOT NULL
            );
            """
        )
        # FTS5 index over content
        self._conn.execute(
            """
            CREATE VIRTUAL TABLE IF NOT EXISTS events_fts
            USING fts5(content, content='events', content_rowid='id');
            """
        )
        self._conn.execute(
            """
            CREATE TRIGGER IF NOT EXISTS events_ai AFTER INSERT ON events BEGIN
              INSERT INTO events_fts(rowid, content) VALUES (new.id, new.content);
            END;
            """
        )
        self._conn.commit()

    def append(self, *, kind: str, content: str, metadata: dict[str, Any]) -> int:
        cur = self._conn.cursor()
        cur.execute(
            "INSERT INTO events(ts, kind, content, metadata_json) VALUES(?,?,?,?)",
            (time(), kind, content, json.dumps(metadata, ensure_ascii=False)),
        )
        self._conn.commit()
        return int(cur.lastrowid)

    def search(self, *, query: str, limit: int = 10) -> list[EpisodicRow]:
        # FTS5 MATCH has its own query syntax; raw user prompts (with punctuation)
        # can cause "fts5: syntax error". Convert to a simple term query.
        terms = re.findall(r"[A-Za-z0-9_]+", query)
        safe_query = " ".join(terms).strip()
        if not safe_query:
            return []
        cur = self._conn.cursor()
        cur.execute(
            """
            SELECT e.id, e.ts, e.kind, e.content, e.metadata_json
            FROM events_fts f
            JOIN events e ON e.id = f.rowid
            WHERE events_fts MATCH ?
            ORDER BY rank
            LIMIT ?;
            """,
            (safe_query, limit),
        )
        rows: list[EpisodicRow] = []
        for rid, ts, kind, content, metadata_json in cur.fetchall():
            rows.append(
                EpisodicRow(
                    id=int(rid),
                    ts=float(ts),
                    kind=str(kind),
                    content=str(content),
                    metadata=json.loads(metadata_json),
                )
            )
        return rows

