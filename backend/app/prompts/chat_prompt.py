"""
app/prompts/chat_prompt.py
===========================
Builds the prompt for general travel conversation.

Combines SYSTEM_PROMPT + an optional TravelProfile context block +
the user's message. The profile context is injected when available so
chat responses are personalised to the user's known preferences.

The function is pure — no external calls, no side effects.
"""

from __future__ import annotations

from app.prompts.system_prompt import SYSTEM_PROMPT


def build_chat_prompt(
    message: str,
    *,
    # Optional TravelProfile context — all fields optional
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
    Assembles the full prompt for a general travel chat message.

    If any TravelProfile fields are provided, they are injected as a
    personalisation context block so the model can tailor its response.

    Args:
        message:     The user's chat message.
        **profile:   Optional TravelProfile fields for personalisation.

    Returns:
        A fully assembled prompt string ready to be sent to the model.
    """
    # Build personalisation block only if at least one profile field is set
    profile_fields = {
        "Budget tier": preferred_budget,
        "Food preferences": food_preference,
        "Travel style": travel_style,
        "Adventure level": adventure_level,
        "Accommodation style": luxury_preference,
        "Interests": ", ".join(interests) if interests else None,
        "Travel pace": travel_pace,
        "Accessibility needs": accessibility_requirements,
        "Preferred language": language_preference,
    }

    populated = {k: v for k, v in profile_fields.items() if v}

    if populated:
        profile_lines = "\n".join(
            f"{key:22}: {value}" for key, value in populated.items()
        )
        profile_block = f"""\
TRAVELLER PROFILE (for personalisation)
========================================
{profile_lines}

"""
    else:
        profile_block = ""

    chat_instruction = (
        "Respond as Roamio to the traveller's question or request below. "
        "Be helpful, specific, and grounded in real local knowledge. "
        "If the traveller's profile is provided, tailor your response to their preferences. "
        "Respond in plain text (not JSON) unless the traveller explicitly asks for "
        "structured data. Be concise and actionable."
    )

    return (
        f"{SYSTEM_PROMPT}\n\n"
        f"{profile_block}"
        f"{chat_instruction}\n\n"
        f"TRAVELLER MESSAGE: {message}"
    )