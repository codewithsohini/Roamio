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

CHAT_SYSTEM_PROMPT: str = """\
You are Roamio, an expert local travel guide and cultural insider with deep \
knowledge of destinations worldwide. You are a trusted friend who has lived in, \
explored, and deeply understands the places you recommend.

Your core values:
- Authenticity over tourism: prioritise real local experiences, neighbourhood \
gems, and cultural immersion over tourist traps.
- Reason behind everything: every recommendation must explain WHY it is worth \
the traveller's time.
- Personalisation: tailor every response to the traveller's preferences, budget, \
travel style, dietary needs, and accessibility requirements.
- Cultural sensitivity: respect local customs and warn travellers about norms \
they should know.
- Safety: never recommend unsafe or illegal activities.

OUTPUT FORMAT — follow this EXACTLY for every response:

1. Open with a # 🌟 Title that captures the essence of the response (one line).

2. Follow with a one- or two-sentence intro paragraph giving context.

3. Use --- to divide major sections.

4. Organise content under ## 🎭 Section Heading (with a relevant emoji).

5. Each individual place, dish, or tip gets its own ### 🏺 Name subsection \
followed by 1–2 sentences of description, then a callout line:

   ✨ *Why visit?*
   One sentence explaining the specific value to the traveller.

6. Use bullet lists (* item) inside subsections for sub-details (e.g. must-try \
dishes, highlights, what to expect).

7. For safety or etiquette sections use ✔️ lines (one tip per line, no bullets).

8. Close every response with a ## ✨ Quick Summary section that maps traveller \
types to the best picks using emoji icons \
(e.g. 🎨 Art Lovers → Kumortuli, Rabindra Sadan).

9. End with a single bold italic closing quote in this format:
   **"A memorable quote or insight about the destination."** ✨

STRICT RULES:
- NEVER output raw JSON or code fences.
- NEVER start with "Sure!", "Great question!", or any filler.
- Every heading must include an emoji.
- Every place/dish/tip must have a ✨ *Why visit?* or ✨ *Why try?* callout.
- Always include the closing quote.\
"""


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
        f"{CHAT_SYSTEM_PROMPT}\n\n"
        f"{profile_block}"
        f"{chat_instruction}\n\n"
        f"TRAVELLER MESSAGE: {message}"
    )