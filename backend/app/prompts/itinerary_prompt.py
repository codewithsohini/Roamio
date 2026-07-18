"""
app/prompts/itinerary_prompt.py
================================
Builds the user-specific itinerary generation prompt.

Combines SYSTEM_PROMPT + FORMATTER_PROMPT + a structured user input block
derived from the trip request and the user's TravelProfile.

The function is pure — no external calls, no side effects. It accepts plain
data values (not ORM objects) so it can be called from any context and
tested without a database session.
"""

from __future__ import annotations

from app.prompts.formatter_prompt import FORMATTER_PROMPT
from app.prompts.system_prompt import SYSTEM_PROMPT


def build_itinerary_prompt(
    *,
    destination: str,
    days: int,
    companions: str | None = None,
    # TravelProfile fields — all optional, defaults applied inline
    preferred_budget: str | None = None,
    food_preference: str | None = None,
    travel_style: str | None = None,
    adventure_level: str | None = None,
    luxury_preference: str | None = None,
    interests: list[str] | None = None,
    travel_pace: str | None = None,
    accessibility_requirements: str | None = None,
    language_preference: str | None = None,
) -> str:
    """
    Assembles the full prompt for itinerary generation.

    Args:
        destination:               Where the traveller is going.
        days:                      Number of travel days.
        companions:                Who they are travelling with.
        preferred_budget:          Budget tier from TravelProfile.
        food_preference:           Dietary preference from TravelProfile.
        travel_style:              e.g. 'cultural', 'adventure'.
        adventure_level:           e.g. 'low', 'medium', 'high'.
        luxury_preference:         Accommodation tier preference.
        interests:                 List of interest tags.
        travel_pace:               e.g. 'slow', 'moderate', 'fast'.
        accessibility_requirements: Free-text accessibility needs.
        language_preference:       BCP-47 language tag.

    Returns:
        A fully assembled prompt string ready to be sent to the model.
    """
    # Apply defaults for unset profile fields so the model always has guidance
    companions_str = companions or "not specified"
    budget_str = preferred_budget or "mid-range"
    food_str = food_preference or "no specific dietary restrictions"
    style_str = travel_style or "mixed"
    adventure_str = adventure_level or "medium"
    luxury_str = luxury_preference or "comfortable but not extravagant"
    interests_str = ", ".join(interests) if interests else "general sightseeing"
    pace_str = travel_pace or "moderate"
    access_str = accessibility_requirements or "none"
    lang_str = language_preference or "en"

    user_block = f"""\
TRAVELLER REQUEST
=================
Destination          : {destination}
Duration             : {days} day{"s" if days != 1 else ""}
Travelling with      : {companions_str}

TRAVELLER PROFILE
=================
Budget tier          : {budget_str}
Food preferences     : {food_str}
Travel style         : {style_str}
Adventure level      : {adventure_str}
Accommodation style  : {luxury_str}
Interests            : {interests_str}
Travel pace          : {pace_str}
Accessibility needs  : {access_str}
Preferred language   : {lang_str}

Generate a complete {days}-day itinerary for {destination} tailored \
precisely to this traveller's profile. The daywise_itinerary array must \
contain exactly {days} entries (one per day). Apply the traveller's \
budget tier, food preferences, travel style, and accessibility needs \
throughout every section of the response.\
"""

    return f"{SYSTEM_PROMPT}\n\n{user_block}\n\n{FORMATTER_PROMPT}"