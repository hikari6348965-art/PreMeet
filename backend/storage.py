import os
import logging
import httpx

logger = logging.getLogger(__name__)

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
APP_NAME = "briefcraft"
_key = None


async def init_storage(force: bool = False) -> str:
    global _key
    if _key and not force:
        return _key
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.post(f"{STORAGE_URL}/init", json={"emergent_key": os.environ["EMERGENT_LLM_KEY"]})
    r.raise_for_status()
    _key = r.json()["storage_key"]
    return _key


async def put_object(path: str, data: bytes, content_type: str) -> dict:
    for attempt in range(2):
        key = await init_storage(force=attempt > 0)
        async with httpx.AsyncClient(timeout=600) as c:
            r = await c.put(f"{STORAGE_URL}/objects/{path}", content=data,
                            headers={"X-Storage-Key": key, "Content-Type": content_type})
        if r.status_code != 404:
            break
    r.raise_for_status()
    return r.json()


async def download_to(path: str, dest: str) -> None:
    for attempt in range(2):
        key = await init_storage(force=attempt > 0)
        async with httpx.AsyncClient(timeout=600) as c:
            async with c.stream("GET", f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}) as r:
                if r.status_code == 404 and attempt == 0:
                    continue
                r.raise_for_status()
                with open(dest, "wb") as f:
                    async for chunk in r.aiter_bytes():
                        f.write(chunk)
                return
