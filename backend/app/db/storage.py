from supabase import create_client, Client
from app.utils.config import settings

_client: Client | None = None


def get_storage_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _client


BUCKET = "documents"


def get_presigned_upload_url(storage_path: str) -> str:
    client = get_storage_client()
    res = client.storage.from_(BUCKET).create_signed_upload_url(storage_path)
    return res["signed_url"]


def delete_file(storage_path: str) -> None:
    client = get_storage_client()
    client.storage.from_(BUCKET).remove([storage_path])
