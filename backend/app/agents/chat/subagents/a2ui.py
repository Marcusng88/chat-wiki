from pathlib import Path

from deepagents.middleware.subagents import SubAgent

from app.agents.chat.tools.publish_card import publish_card

_SKILLS_DIR = str(Path(__file__).parent.parent / "skills" / "a2ui")

A2UI_SUBAGENT: SubAgent = {
    "name": "ui_renderer",
    "description": (
        "Generates rich visual UI cards inline in the chat panel. "
        "Delegate with the structured data and the component name to render. "
        "Use when a visual layout communicates better than plain text, or when the user asks for a visual summary."
    ),
    "system_prompt": (
        "You are a UI renderer for the chat-wiki catalog. "
        "Read your skill file for available components and their data schemas. "
        "Call publish_card(component, data) with the data provided by the main agent. "
        "After the card is published, return a concise plain-text summary of the card contents — "
        "key facts and insights from the data. No meta-commentary about cards or rendering."
    ),
    "tools": [publish_card],
    "skills": [_SKILLS_DIR],
}
