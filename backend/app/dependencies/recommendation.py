"""
app/dependencies/recommendation.py
=====================================
FastAPI dependency that wires AIProvider and PromptBuilder into
RecommendationService and returns a ready-to-use instance.

Usage in any route:
    from app.dependencies.recommendation import get_recommendation_service
    from app.services.recommendation_service import RecommendationService

    @router.post("/journeys")
    async def create_journey(
        ...
        svc: RecommendationService = Depends(get_recommendation_service),
    ):
        ...

The function is a plain dependency (not a generator) because
RecommendationService holds no resources that need closing — it is
stateless aside from the injected AIProvider singleton.
"""

from app.ai.factory import get_ai_provider
from app.services.prompt_builder import PromptBuilder
from app.services.recommendation_service import RecommendationService


def get_recommendation_service() -> RecommendationService:
    """
    Returns a RecommendationService instance with the configured AIProvider
    and a fresh PromptBuilder.

    get_ai_provider() is lru_cache-backed — the same AIProvider instance
    is reused across all requests in the process lifetime, which means the
    IAM token cache (inside GraniteService) is also shared and reused.
    """
    return RecommendationService(
        ai_provider=get_ai_provider(),
        prompt_builder=PromptBuilder(),
    )