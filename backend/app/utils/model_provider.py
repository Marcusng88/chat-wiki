from deepagents import HarnessProfile, register_harness_profile, GeneralPurposeSubagentProfile
from langchain.chat_models import init_chat_model
from langchain_openai import OpenAIEmbeddings
from app.utils.config import settings

_LLM_MODEL = "openai:gpt-5.4-mini-2026-03-17"

register_harness_profile(
    _LLM_MODEL,
    HarnessProfile(
        excluded_tools=frozenset({"ls", "read_file", "write_file", "edit_file", "glob", "grep"}),
        general_purpose_subagent=GeneralPurposeSubagentProfile(enabled=False)

    ),
)


def get_llm(temperature: float = 0.0):
    return init_chat_model(
        _LLM_MODEL,
        temperature=temperature,
        api_key=settings.openai_api_key,
    )



def get_embeddings() -> OpenAIEmbeddings:
    return OpenAIEmbeddings(
        model="text-embedding-3-small",
        api_key=settings.openai_api_key,
    )

# Gemini alternatives (swap above to enable):
# def get_llm():
#     return init_chat_model(
#         "google_genai:gemini-2.0-flash",
#         temperature=0.0,
#         api_key=settings.google_api_key,
#     )
#
# from langchain_google_genai import GoogleGenerativeAIEmbeddings
# def get_embeddings():
#     return GoogleGenerativeAIEmbeddings(
#         model="models/text-embedding-004",
#         google_api_key=settings.google_api_key,
#     )
