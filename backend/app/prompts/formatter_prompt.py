"""
app/prompts/formatter_prompt.py
================================
Enforces the structured JSON output schema on every itinerary request.

This constant is appended to the itinerary prompt (after SYSTEM_PROMPT
and the user input block) to lock down the exact shape of the AI output.

It mirrors the Structured AI Output Schema from the implementation plan
exactly. If the schema changes, update both this file and the Pydantic
validation schemas in app/schemas/.
"""

FORMATTER_PROMPT: str = """\
You MUST respond with a single valid JSON object that matches the following \
schema exactly. Do not produce any text outside this JSON object — no \
preamble, no explanation, no code fences, no markdown.

Required JSON schema:
{
  "trip_summary": {
    "destination": "<string: full destination name>",
    "duration_days": <integer: number of travel days>,
    "travel_style": "<string: e.g. cultural, adventure, relaxation>",
    "budget_tier": "<string: e.g. budget, mid-range, luxury>"
  },
  "daywise_itinerary": [
    {
      "day": <integer: day number starting from 1>,
      "theme": "<string: theme or focus for this day>",
      "activities": [
        "<string: activity description>"
      ],
      "why": "<string: why this day's plan suits the traveller>"
    }
  ],
  "hidden_gems": [
    {
      "name": "<string: name of the place or experience>",
      "description": "<string: what it is>",
      "why": "<string: why this hidden gem specifically suits this traveller>"
    }
  ],
  "food": [
    {
      "name": "<string: restaurant or food experience name>",
      "type": "<string: cuisine type or category>",
      "description": "<string: what makes it special>",
      "why": "<string: why it matches the traveller's food preferences>"
    }
  ],
  "shopping": [
    {
      "name": "<string: market, shop, or district name>",
      "category": "<string: e.g. souvenirs, crafts, fashion>",
      "description": "<string: what can be found here>",
      "why": "<string: why this is worth the traveller's time>"
    }
  ],
  "stay": [
    {
      "name": "<string: accommodation name or area>",
      "area": "<string: neighbourhood or district>",
      "description": "<string: type and character of the stay>",
      "why": "<string: why it matches the traveller's budget and style>"
    }
  ],
  "culture": [
    {
      "tip": "<string: cultural norm, etiquette rule, or local insight>",
      "why": "<string: why this tip matters for this destination>"
    }
  ],
  "travel_tips": [
    "<string: practical tip for this destination>"
  ],
  "estimated_budget": {
    "accommodation": "<string: e.g. $30–50/night>",
    "food": "<string: e.g. $15–25/day>",
    "transport": "<string: e.g. $5–10/day>",
    "activities": "<string: e.g. $20–40 total>",
    "total": "<string: e.g. $300–500 for 7 days>"
  },
  "why_this_plan": "<string: a concise paragraph explaining why this overall \
plan is the best fit for this specific traveller>"
}

Rules:
- The daywise_itinerary array MUST contain exactly one entry per day \
(matching the requested number of days). Do not merge or skip days.
- Every array must contain at least one item. No empty arrays.
- Every string field must be populated. No empty strings, no null values.
- Use the traveller's actual preferences from the request to inform every \
field — do not produce a generic itinerary.
- The estimated_budget values must reflect the requested budget tier and \
destination's real cost of living.
- Output only the JSON object. No text before or after.\
"""
