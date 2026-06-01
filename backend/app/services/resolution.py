import logging

from langchain_core.messages import HumanMessage

from app.agents.conflict_resolver.agent import build_conflict_resolver_agent

logger = logging.getLogger(__name__)


async def run_resolver(user_id: str) -> None:
    logger.info("Conflict scan started for user %s", user_id)

    agent = build_conflict_resolver_agent()
    await agent.ainvoke(
        {"messages": [HumanMessage(content="Scan all unscanned documents for conflicts.")]},
        config={"configurable": {"user_id": user_id}, "recursion_limit": 150},
    )

    logger.info("Conflict scan complete for user %s", user_id)
