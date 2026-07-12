"""
app/dependencies/db.py
=======================
Re-exports the get_db dependency from app.core.database.

Having a canonical import path at app.dependencies.db keeps all FastAPI
dependency imports in one predictable namespace. Route files import from
here rather than directly from app.core.database — the core package stays
an infrastructure concern, not a FastAPI-specific one.

Usage in any route:
    from sqlalchemy.orm import Session
    from fastapi import Depends
    from app.dependencies.db import get_db

    @router.get("/example")
    def example(db: Session = Depends(get_db)):
        ...
"""

from app.core.database import get_db  # noqa: F401 — re-exported intentionally

__all__ = ["get_db"]
