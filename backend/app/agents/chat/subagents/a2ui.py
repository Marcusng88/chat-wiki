from pathlib import Path

from deepagents.middleware.subagents import SubAgent

from app.agents.chat.tools.render_ui import render_ui

_AGENTS_MD = Path(__file__).parent / "AGENTS.md"
_SKILLS_DIR = "skills/a2ui"

A2UI_SUBAGENT: SubAgent = {
    "name": "ui_renderer",
    "description": (
        "Generates rich visual UI surfaces inline in the chat panel by composing "
        "primitives from the A2UI basic catalog (Text, Row, Column, Card, Icon, etc.). "
        "Delegate with the data to display and the visual intent. "
        "Use when a visual layout communicates better than plain text, "
        "or when the user asks for a visual summary, comparison, or overview."
    ),
    "system_prompt": _AGENTS_MD.read_text(encoding="utf-8"),
    "tools": [render_ui],
    "skills": [_SKILLS_DIR],
}
