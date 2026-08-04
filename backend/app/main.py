from contextlib import asynccontextmanager
from datetime import datetime, timezone
import logging
from typing import Any, AsyncIterator

import asyncpg
import httpx
from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.config import Settings, get_settings


logger = logging.getLogger(__name__)


class ApiResponse(BaseModel):
    success: bool
    message: str


class BookingRequest(BaseModel):
    session_id: str
    location_id: str | None = None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    app.state.db_pool = await _create_pool_with_fallback(settings)
    try:
        yield
    finally:
        await app.state.db_pool.close()


async def _create_pool_with_fallback(settings: Settings) -> asyncpg.Pool:
    last_error: Exception | None = None

    for index, dsn in enumerate(settings.database_urls(), start=1):
        try:
            logger.info("Attempting database connection using DATABASE_URL option %d", index)
            return await asyncpg.create_pool(dsn=dsn, min_size=1, max_size=8)
        except Exception as exc:
            last_error = exc
            logger.warning("Database connection attempt %d failed: %s", index, exc)

    if last_error is not None:
        raise last_error

    raise RuntimeError("No database URLs configured")


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=ApiResponse(success=False, message=detail).model_dump(),
    )


def _database_unavailable_response():
    return fastapi_json_response(
        status.HTTP_503_SERVICE_UNAVAILABLE,
        ApiResponse(success=False, message="database is unavailable").model_dump(),
    )


async def _read_user_id_from_token(token: str, settings: Settings) -> str:
    url = f"{settings.supabase_url.rstrip('/')}/auth/v1/user"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                url,
                headers={
                    "apikey": settings.supabase_anon_key,
                    "Authorization": f"Bearer {token}",
                },
            )
    except httpx.HTTPError as exc:
        logger.warning("Supabase token validation request failed: %s", exc)
        raise _unauthorized("invalid token") from exc

    if response.status_code != status.HTTP_200_OK:
        logger.warning("Supabase token validation failed with status %d", response.status_code)
        raise _unauthorized("invalid token")

    try:
        payload = response.json()
    except ValueError as exc:
        logger.warning("Supabase token validation returned invalid JSON")
        raise _unauthorized("invalid token") from exc

    user_id = payload.get("id")
    if not isinstance(user_id, str) or not user_id:
        raise _unauthorized("invalid token")

    return user_id


async def get_user_id(
    authorization: str | None = Header(default=None, alias="Authorization"),
    settings: Settings = Depends(get_settings),
) -> str:
    if authorization is None:
        raise _unauthorized("missing Authorization header")

    if not authorization.startswith("Bearer "):
        raise _unauthorized("invalid bearer token")

    token = authorization[len("Bearer ") :].strip()
    if not token:
        raise _unauthorized("invalid bearer token")

    return await _read_user_id_from_token(token, settings)


@app.exception_handler(HTTPException)
async def http_exception_handler(_, exc: HTTPException):
    detail = exc.detail
    if isinstance(detail, dict) and {"success", "message"}.issubset(detail.keys()):
        return fastapi_json_response(exc.status_code, detail)
    if isinstance(detail, str):
        return fastapi_json_response(exc.status_code, ApiResponse(success=False, message=detail).model_dump())
    return fastapi_json_response(
        exc.status_code,
        ApiResponse(success=False, message="request failed").model_dump(),
    )


@app.exception_handler(asyncpg.exceptions.PostgresConnectionError)
async def db_connection_error_handler(_, exc: asyncpg.exceptions.PostgresConnectionError):
    return _database_unavailable_response()


@app.exception_handler(asyncpg.InterfaceError)
async def db_interface_error_handler(_, exc: asyncpg.InterfaceError):
    # Covers scenarios like using a closed/invalid connection pool.
    return _database_unavailable_response()


@app.get("/health", response_model=ApiResponse)
async def health() -> ApiResponse:
    return ApiResponse(success=True, message="ok")


@app.post("/bookings", response_model=ApiResponse)
async def book_class(request: BookingRequest, user_id: str = Depends(get_user_id)) -> ApiResponse:
    if not request.session_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ApiResponse(success=False, message="session_id is required").model_dump(),
        )
    if not request.location_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ApiResponse(success=False, message="location_id is required").model_dump(),
        )

    pool: asyncpg.Pool = app.state.db_pool

    async with pool.acquire() as conn:
        async with conn.transaction():
            location_exists = await conn.fetchval(
                """
                select exists(
                  select 1 from locations where id = $1 and is_active = true
                )
                """,
                request.location_id,
            )
            if not location_exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=ApiResponse(success=False, message="active location not found").model_dump(),
                )

            row = await conn.fetchrow(
                """
                select cs.scheduled_at, cs.capacity
                from class_sessions cs
                join class_templates ct on ct.id = cs.template_id
                where cs.id = $1
                  and cs.status = 'scheduled'
                  and ct.is_active = true
                  and (now() at time zone 'UTC')::date >= ct.valid_from
                  and (ct.valid_until is null or (now() at time zone 'UTC')::date <= ct.valid_until)
                  and (cs.scheduled_at at time zone 'UTC')::date >= ct.valid_from
                  and (ct.valid_until is null or (cs.scheduled_at at time zone 'UTC')::date <= ct.valid_until)
                for update of cs
                """,
                request.session_id,
            )
            if row is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=ApiResponse(success=False, message="class session not found").model_dump(),
                )

            booked_count = await conn.fetchval(
                """
                select count(*)::int
                from bookings
                where session_id = $1 and status = 'confirmed'
                """,
                request.session_id,
            )

            if booked_count >= row["capacity"]:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=ApiResponse(success=False, message="class is full").model_dump(),
                )

            await conn.execute(
                """
                insert into bookings (user_id, session_id, location_id, status)
                values ($1, $2, $3, 'confirmed')
                on conflict (user_id, session_id)
                do update set location_id = $3, status = 'confirmed', cancelled_at = null
                """,
                user_id,
                request.session_id,
                request.location_id,
            )

    return ApiResponse(success=True, message="Booking confirmed")


@app.post("/bookings/cancel", response_model=ApiResponse)
async def cancel_booking(request: BookingRequest, user_id: str = Depends(get_user_id)) -> ApiResponse:
    if not request.session_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ApiResponse(success=False, message="session_id is required").model_dump(),
        )

    pool: asyncpg.Pool = app.state.db_pool

    async with pool.acquire() as conn:
        scheduled_at = await conn.fetchval(
            """
            select cs.scheduled_at
            from class_sessions cs
            join bookings b on b.session_id = cs.id
            where cs.id = $1 and b.user_id = $2 and b.status = 'confirmed'
            """,
            request.session_id,
            user_id,
        )

        if scheduled_at is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=ApiResponse(success=False, message="active booking not found").model_dump(),
            )

        if isinstance(scheduled_at, datetime):
            now = datetime.now(timezone.utc)
            if scheduled_at.tzinfo is None:
                scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
            if (scheduled_at - now).total_seconds() <= 2 * 60 * 60:
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail=ApiResponse(success=False, message="cancellation window closed").model_dump(),
                )

        await conn.execute(
            """
            update bookings
            set status = 'cancelled', cancelled_at = now()
            where user_id = $1 and session_id = $2 and status = 'confirmed'
            """,
            user_id,
            request.session_id,
        )

    return ApiResponse(success=True, message="Booking cancelled")


def fastapi_json_response(status_code: int, payload: dict[str, Any]):
    from fastapi.responses import JSONResponse

    return JSONResponse(status_code=status_code, content=payload)
