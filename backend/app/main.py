from contextlib import asynccontextmanager
from datetime import date, datetime, time, timezone
import logging
from typing import Any, AsyncIterator, Literal
from uuid import UUID

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
    error_code: str | None = None


class BookingRequest(BaseModel):
    template_id: UUID
    requested_date: date
    location_id: UUID | None = None


class CancelBookingRequest(BaseModel):
    session_id: UUID


class ClassTemplateRequest(BaseModel):
    title: str
    description: str
    trainer_name: str
    exercise_type: str
    duration_minutes: int
    days_of_week_mask: int
    start_time: time
    capacity: int
    difficulty_level: Literal["beginner", "intermediate", "advanced"]
    location_id: UUID
    valid_from: date | None = None
    valid_until: date | None = None
    is_active: bool = True


class ClassTemplateActiveRequest(BaseModel):
    is_active: bool


class LocationRequest(BaseModel):
    name: str
    description: str | None = None
    address: str | None = None
    is_active: bool = True


class ActiveRequest(BaseModel):
    is_active: bool


class NotificationTokenRequest(BaseModel):
    token: str
    platform: str


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
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=ApiResponse(success=False, message=detail).model_dump(),
    )


def _forbidden(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=ApiResponse(success=False, message=detail).model_dump(),
    )


def _database_unavailable_response():
    return fastapi_json_response(
        status.HTTP_503_SERVICE_UNAVAILABLE,
        ApiResponse(success=False, message="database is unavailable").model_dump(),
    )


def _json_value(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, time):
        return value.isoformat()
    return value


def _record_to_dict(record: asyncpg.Record) -> dict[str, Any]:
    return {key: _json_value(record[key]) for key in record.keys()}


def _records_to_dicts(records: list[asyncpg.Record]) -> list[dict[str, Any]]:
    return [_record_to_dict(record) for record in records]


def _parse_start_time(value: str | time) -> tuple[int, int]:
    if isinstance(value, time):
        return value.hour, value.minute

    parts = value.split(":")
    if len(parts) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ApiResponse(success=False, message="start_time must use HH:MM format").model_dump(),
        )

    try:
        hours = int(parts[0])
        minutes = int(parts[1])
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ApiResponse(success=False, message="start_time must use HH:MM format").model_dump(),
        ) from exc

    if hours < 0 or hours > 23 or minutes < 0 or minutes > 59:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ApiResponse(success=False, message="start_time must use HH:MM format").model_dump(),
        )

    return hours, minutes


def _weekday_in_mask(days_of_week_mask: int, day_of_week: int) -> bool:
    if day_of_week < 0 or day_of_week > 6:
        return False
    return (days_of_week_mask & (1 << day_of_week)) != 0


def _is_template_available_for_date(
    requested_date: date,
    valid_from: date,
    valid_until: date | None,
    days_of_week_mask: int,
) -> bool:
    if requested_date < valid_from:
        return False
    if valid_until is not None and requested_date > valid_until:
        return False

    js_day = (requested_date.weekday() + 1) % 7
    return _weekday_in_mask(days_of_week_mask, js_day)


def _scheduled_at_for_date_and_time(requested_date: date, start_time: str | time) -> datetime:
    hours, minutes = _parse_start_time(start_time)
    return datetime(
        requested_date.year,
        requested_date.month,
        requested_date.day,
        hours,
        minutes,
        tzinfo=timezone.utc,
    )


async def _update_future_class_session_capacity(
    conn: asyncpg.Connection,
    template_id: str,
    capacity: int,
) -> None:
    await conn.execute(
        """
        update class_sessions
        set capacity = $2, updated_at = now()
        where template_id = $1
          and status = 'scheduled'
          and scheduled_at >= now()
        """,
        template_id,
        capacity,
    )


async def _read_user_from_token(token: str, settings: Settings) -> dict[str, Any]:
    url = f"{settings.supabase_url.rstrip('/')}/auth/v1/user"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                url,
                headers={
                    "apikey": settings.supabase_publishable_key,
                    "Authorization": f"Bearer {token}",
                },
            )
    except httpx.HTTPError as exc:
        logger.warning("Supabase token validation request failed: %s", exc)
        raise _unauthorized("session validation failed") from exc

    if response.status_code != status.HTTP_200_OK:
        logger.warning(
            "Supabase token validation failed with status %d: %s",
            response.status_code,
            response.text[:200],
        )
        raise _unauthorized("session expired or invalid")

    try:
        payload = response.json()
    except ValueError as exc:
        logger.warning("Supabase token validation returned invalid JSON")
        raise _unauthorized("session validation failed") from exc

    user_id = payload.get("id")
    if not isinstance(user_id, str) or not user_id:
        raise _unauthorized("session validation failed")

    return payload


async def _read_user_id_from_token(token: str, settings: Settings) -> str:
    payload = await _read_user_from_token(token, settings)
    return payload["id"]


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


async def get_auth_user(
    authorization: str | None = Header(default=None, alias="Authorization"),
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    if authorization is None:
        raise _unauthorized("missing Authorization header")

    if not authorization.startswith("Bearer "):
        raise _unauthorized("invalid bearer token")

    token = authorization[len("Bearer ") :].strip()
    if not token:
        raise _unauthorized("invalid bearer token")

    return await _read_user_from_token(token, settings)


async def require_admin_user(user_id: str = Depends(get_user_id)) -> str:
    pool: asyncpg.Pool = app.state.db_pool
    async with pool.acquire() as conn:
        role = await conn.fetchval("select role from profiles where id = $1", user_id)

    if role != "admin":
        raise _forbidden("admin access required")

    return user_id


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


@app.get("/classes")
async def list_classes(date: str | None = None) -> list[dict[str, Any]]:
    pool: asyncpg.Pool = app.state.db_pool
    async with pool.acquire() as conn:
        if date:
            rows = await conn.fetch(
                """
                select *
                from classes_feed
                where date = $1
                order by date asc, start_time asc
                """,
                date,
            )
        else:
            rows = await conn.fetch(
                """
                select *
                from classes_feed
                order by date asc, start_time asc
                """
            )

    return _records_to_dicts(rows)


@app.get("/class-templates/public")
async def list_public_class_templates() -> list[dict[str, Any]]:
    pool: asyncpg.Pool = app.state.db_pool
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            select
              ct.id,
              ct.title,
              ct.description,
              ct.trainer_name,
              ct.exercise_type,
              ct.duration_minutes,
              ct.days_of_week_mask,
              ct.start_time,
              ct.capacity,
              ct.difficulty_level,
              ct.location_id,
              l.name as location_name,
              ct.valid_from,
              ct.valid_until,
              ct.created_at,
              ct.updated_at
            from class_templates ct
            join locations l on l.id = ct.location_id
            where ct.is_active = true
            order by ct.start_time asc, ct.title asc
            """
        )

    return _records_to_dicts(rows)


@app.get("/class-templates/public/{template_id}")
async def get_public_class_template(template_id: str) -> dict[str, Any]:
    pool: asyncpg.Pool = app.state.db_pool
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            select
              ct.id,
              ct.title,
              ct.description,
              ct.trainer_name,
              ct.exercise_type,
              ct.duration_minutes,
              ct.days_of_week_mask,
              ct.start_time,
              ct.capacity,
              ct.difficulty_level,
              ct.location_id,
              l.name as location_name,
              ct.valid_from,
              ct.valid_until,
              ct.created_at,
              ct.updated_at
            from class_templates ct
            join locations l on l.id = ct.location_id
            where ct.id = $1 and ct.is_active = true
            """,
            template_id,
        )

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ApiResponse(success=False, message="class template not found").model_dump(),
        )

    return _record_to_dict(row)


@app.get("/classes/{class_id}")
async def get_class(class_id: str) -> dict[str, Any]:
    pool: asyncpg.Pool = app.state.db_pool
    async with pool.acquire() as conn:
        row = await conn.fetchrow("select * from classes_feed where id = $1", class_id)

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ApiResponse(success=False, message="class not found").model_dump(),
        )

    return _record_to_dict(row)


@app.get("/locations/active")
async def list_active_locations() -> list[dict[str, Any]]:
    pool: asyncpg.Pool = app.state.db_pool
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            select *
            from locations
            where is_active = true
            order by name asc
            """
        )

    return _records_to_dicts(rows)


@app.get("/bookings/me")
async def list_my_bookings(user_id: str = Depends(get_user_id)) -> list[dict[str, Any]]:
    pool: asyncpg.Pool = app.state.db_pool
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            select *
            from bookings_feed
            where user_id = $1 and status = 'confirmed'
            order by date asc, start_time asc
            """,
            user_id,
        )

    return _records_to_dicts(rows)


@app.get("/me")
async def get_me(user_id: str = Depends(get_user_id)) -> dict[str, Any] | None:
    pool: asyncpg.Pool = app.state.db_pool
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            select id, full_name, email, avatar_url, role
            from profiles
            where id = $1
            """,
            user_id,
        )

    return _record_to_dict(row) if row is not None else None


@app.post("/profiles/me/ensure")
async def ensure_my_profile(auth_user: dict[str, Any] = Depends(get_auth_user)) -> dict[str, Any] | None:
    user_id = auth_user["id"]
    metadata = auth_user.get("user_metadata")
    if not isinstance(metadata, dict):
        metadata = {}

    email = auth_user.get("email")
    full_name = metadata.get("full_name") or email
    avatar_url = metadata.get("avatar_url")

    pool: asyncpg.Pool = app.state.db_pool
    async with pool.acquire() as conn:
        await conn.execute(
            """
            insert into profiles (id, full_name, email, avatar_url)
            values ($1, $2, $3, $4)
            on conflict (id) do nothing
            """,
            user_id,
            full_name,
            email,
            avatar_url,
        )
        row = await conn.fetchrow(
            """
            select id, full_name, email, avatar_url, role
            from profiles
            where id = $1
            """,
            user_id,
        )

    return _record_to_dict(row) if row is not None else None


@app.post("/notification-tokens", response_model=ApiResponse)
async def register_notification_token(
    request: NotificationTokenRequest,
    user_id: str = Depends(get_user_id),
) -> ApiResponse:
    if not request.token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ApiResponse(success=False, message="token is required").model_dump(),
        )

    pool: asyncpg.Pool = app.state.db_pool
    async with pool.acquire() as conn:
        await conn.execute(
            """
            insert into notification_tokens (user_id, token, platform)
            values ($1, $2, $3)
            on conflict (user_id, token) do update
            set platform = excluded.platform
            """,
            user_id,
            request.token,
            request.platform,
        )

    return ApiResponse(success=True, message="Notification token registered")


@app.get("/admin/classes")
async def list_class_templates(_: str = Depends(require_admin_user)) -> list[dict[str, Any]]:
    pool: asyncpg.Pool = app.state.db_pool
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            select ct.*, l.name as location_name
            from class_templates ct
            left join locations l on l.id = ct.location_id
            order by ct.is_active desc, ct.days_of_week_mask asc, ct.start_time asc
            """
        )

    return _records_to_dicts(rows)


@app.post("/admin/classes")
async def create_class_template(
    request: ClassTemplateRequest,
    user_id: str = Depends(require_admin_user),
) -> dict[str, Any]:
    pool: asyncpg.Pool = app.state.db_pool
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                location_name = await conn.fetchval(
                    "select name from locations where id = $1",
                    str(request.location_id),
                )
                if not location_name:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=ApiResponse(success=False, message="location not found").model_dump(),
                    )

                row = await conn.fetchrow(
                    """
                    insert into class_templates (
                      title,
                      description,
                      trainer_name,
                      exercise_type,
                      duration_minutes,
                      days_of_week_mask,
                      start_time,
                      capacity,
                      difficulty_level,
                      location_id,
                      valid_from,
                      valid_until,
                      created_by,
                      is_active
                    )
                    values ($1, $2, $3, $4, $5, $6, $7::time, $8, $9, $10::uuid, coalesce($11::date, current_date), $12::date, $13, $14)
                    returning *, (select name from locations where id = location_id) as location_name
                    """,
                    request.title,
                    request.description,
                    request.trainer_name,
                    request.exercise_type,
                    request.duration_minutes,
                    request.days_of_week_mask,
                    request.start_time,
                    request.capacity,
                    request.difficulty_level,
                    str(request.location_id),
                    request.valid_from,
                    request.valid_until,
                    user_id,
                    request.is_active,
                )
                await _update_future_class_session_capacity(conn, str(row["id"]), row["capacity"])
    except asyncpg.exceptions.ForeignKeyViolationError as exc:
        logger.warning("Create class template failed due to foreign key violation: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ApiResponse(success=False, message="location not found").model_dump(),
        ) from exc
    except asyncpg.exceptions.NotNullViolationError as exc:
        logger.warning("Create class template failed due to not-null constraint: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ApiResponse(success=False, message="missing required class template fields").model_dump(),
        ) from exc
    except asyncpg.exceptions.CheckViolationError as exc:
        logger.warning("Create class template failed due to check constraint: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ApiResponse(success=False, message="invalid class template values").model_dump(),
        ) from exc
    except asyncpg.exceptions.DataError as exc:
        logger.warning("Create class template failed due to invalid value format: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ApiResponse(success=False, message="invalid class template data format").model_dump(),
        ) from exc
    except (
        asyncpg.exceptions.UndefinedColumnError,
        asyncpg.exceptions.UndefinedTableError,
    ) as exc:
        logger.error("Create class template failed due to missing database objects: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=ApiResponse(success=False, message="class save is temporarily unavailable; database schema mismatch").model_dump(),
        ) from exc
    except asyncpg.PostgresError as exc:
        logger.exception("Create class template failed with unexpected postgres error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ApiResponse(success=False, message="class save failed due to a database error").model_dump(),
        ) from exc

    return _record_to_dict(row)


@app.patch("/admin/classes/{template_id}")
async def update_class_template(
    template_id: str,
    request: ClassTemplateRequest,
    _: str = Depends(require_admin_user),
) -> dict[str, Any]:
    pool: asyncpg.Pool = app.state.db_pool
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                location_name = await conn.fetchval(
                    "select name from locations where id = $1",
                    str(request.location_id),
                )
                if not location_name:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=ApiResponse(success=False, message="location not found").model_dump(),
                    )

                row = await conn.fetchrow(
                    """
                    update class_templates
                    set title = $2,
                        description = $3,
                        trainer_name = $4,
                        exercise_type = $5,
                        duration_minutes = $6,
                        days_of_week_mask = $7,
                        start_time = $8::time,
                        capacity = $9,
                        difficulty_level = $10,
                        location_id = $11::uuid,
                        valid_from = coalesce($12::date, valid_from),
                        valid_until = $13::date,
                        is_active = $14,
                        updated_at = now()
                    where id = $1
                    returning *, (select name from locations where id = location_id) as location_name
                    """,
                    template_id,
                    request.title,
                    request.description,
                    request.trainer_name,
                    request.exercise_type,
                    request.duration_minutes,
                    request.days_of_week_mask,
                    request.start_time,
                    request.capacity,
                    request.difficulty_level,
                    str(request.location_id),
                    request.valid_from,
                    request.valid_until,
                    request.is_active,
                )

                if row is None:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=ApiResponse(success=False, message="class template not found").model_dump(),
                    )
                await _update_future_class_session_capacity(conn, str(row["id"]), row["capacity"])
    except asyncpg.exceptions.ForeignKeyViolationError as exc:
        logger.warning("Update class template failed due to foreign key violation: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ApiResponse(success=False, message="location not found").model_dump(),
        ) from exc
    except asyncpg.exceptions.NotNullViolationError as exc:
        logger.warning("Update class template failed due to not-null constraint: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ApiResponse(success=False, message="missing required class template fields").model_dump(),
        ) from exc
    except asyncpg.exceptions.CheckViolationError as exc:
        logger.warning("Update class template failed due to check constraint: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ApiResponse(success=False, message="invalid class template values").model_dump(),
        ) from exc
    except asyncpg.exceptions.DataError as exc:
        logger.warning("Update class template failed due to invalid value format: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ApiResponse(success=False, message="invalid class template data format").model_dump(),
        ) from exc
    except (
        asyncpg.exceptions.UndefinedColumnError,
        asyncpg.exceptions.UndefinedTableError,
    ) as exc:
        logger.error("Update class template failed due to missing database objects: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=ApiResponse(success=False, message="class save is temporarily unavailable; database schema mismatch").model_dump(),
        ) from exc
    except asyncpg.PostgresError as exc:
        logger.exception("Update class template failed with unexpected postgres error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ApiResponse(success=False, message="class save failed due to a database error").model_dump(),
        ) from exc

    return _record_to_dict(row)


@app.patch("/admin/classes/{template_id}/active", response_model=ApiResponse)
async def set_class_template_active(
    template_id: str,
    request: ClassTemplateActiveRequest,
    _: str = Depends(require_admin_user),
) -> ApiResponse:
    pool: asyncpg.Pool = app.state.db_pool
    async with pool.acquire() as conn:
        async with conn.transaction():
            row = await conn.fetchrow(
                """
                update class_templates
                set is_active = $2, updated_at = now()
                where id = $1
                returning id
                """,
                template_id,
                request.is_active,
            )

            if row is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=ApiResponse(success=False, message="class template not found").model_dump(),
                )

    return ApiResponse(success=True, message="Class status updated")


@app.get("/admin/locations")
async def list_locations(_: str = Depends(require_admin_user)) -> list[dict[str, Any]]:
    pool: asyncpg.Pool = app.state.db_pool
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            select *
            from locations
            order by is_active desc, name asc
            """
        )

    return _records_to_dicts(rows)


@app.post("/admin/locations")
async def create_location(
    request: LocationRequest,
    user_id: str = Depends(require_admin_user),
) -> dict[str, Any]:
    pool: asyncpg.Pool = app.state.db_pool
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            insert into locations (name, description, address, is_active, created_by)
            values ($1, $2, $3, $4, $5)
            returning *
            """,
            request.name,
            request.description,
            request.address,
            request.is_active,
            user_id,
        )

    return _record_to_dict(row)


@app.patch("/admin/locations/{location_id}")
async def update_location(
    location_id: str,
    request: LocationRequest,
    _: str = Depends(require_admin_user),
) -> dict[str, Any]:
    pool: asyncpg.Pool = app.state.db_pool
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            update locations
            set name = $2,
                description = $3,
                address = $4,
                is_active = $5,
                updated_at = now()
            where id = $1
            returning *
            """,
            location_id,
            request.name,
            request.description,
            request.address,
            request.is_active,
        )

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ApiResponse(success=False, message="location not found").model_dump(),
        )

    return _record_to_dict(row)


@app.patch("/admin/locations/{location_id}/active", response_model=ApiResponse)
async def set_location_active(
    location_id: str,
    request: ActiveRequest,
    _: str = Depends(require_admin_user),
) -> ApiResponse:
    pool: asyncpg.Pool = app.state.db_pool
    async with pool.acquire() as conn:
        result = await conn.execute(
            """
            update locations
            set is_active = $2, updated_at = now()
            where id = $1
            """,
            location_id,
            request.is_active,
        )

    if result == "UPDATE 0":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ApiResponse(success=False, message="location not found").model_dump(),
        )

    return ApiResponse(success=True, message="Location status updated")


@app.get("/admin/bookings")
async def list_all_bookings(_: str = Depends(require_admin_user)) -> list[dict[str, Any]]:
    pool: asyncpg.Pool = app.state.db_pool
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            select *
            from bookings_feed
            where status = 'confirmed'
            order by date asc, start_time asc
            """
        )

    return _records_to_dicts(rows)


@app.post("/bookings", response_model=ApiResponse)
async def book_class(request: BookingRequest, user_id: str = Depends(get_user_id)) -> ApiResponse:
    if not request.location_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ApiResponse(
                success=False,
                message="location_id is required",
                error_code="LOCATION_ID_REQUIRED",
            ).model_dump(),
        )

    pool: asyncpg.Pool = app.state.db_pool

    try:
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
                        detail=ApiResponse(
                            success=False,
                            message="active location not found",
                            error_code="LOCATION_NOT_FOUND",
                        ).model_dump(),
                    )

                row = await conn.fetchrow(
                    """
                    select id, days_of_week_mask, start_time, capacity, valid_from, valid_until, is_active
                    from class_templates
                    where id = $1
                    """,
                    request.template_id,
                )
                if row is None:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=ApiResponse(
                            success=False,
                            message="class template not found",
                            error_code="CLASS_TEMPLATE_NOT_FOUND",
                        ).model_dump(),
                    )

                if not row["is_active"]:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=ApiResponse(
                            success=False,
                            message="class is inactive",
                            error_code="CLASS_INACTIVE",
                        ).model_dump(),
                    )

                if not _is_template_available_for_date(
                    request.requested_date,
                    row["valid_from"],
                    row["valid_until"],
                    row["days_of_week_mask"],
                ):
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=ApiResponse(
                            success=False,
                            message="class is not available for the selected date",
                            error_code="CLASS_NOT_AVAILABLE_FOR_DATE",
                        ).model_dump(),
                    )

                scheduled_at = _scheduled_at_for_date_and_time(
                    request.requested_date,
                    row["start_time"],
                )

                session = await conn.fetchrow(
                    """
                    insert into class_sessions (template_id, scheduled_at, capacity, status)
                    values ($1, $2, $3, 'scheduled')
                    on conflict (template_id, scheduled_at) do update
                    set capacity = class_sessions.capacity
                    returning id, capacity
                    """,
                    request.template_id,
                    scheduled_at,
                    row["capacity"],
                )

                if session is None:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=ApiResponse(
                            success=False,
                            message="could not create class session",
                            error_code="CLASS_SESSION_CREATE_FAILED",
                        ).model_dump(),
                    )

                booked_count = await conn.fetchval(
                    """
                    select count(*)::int
                    from bookings
                    where session_id = $1 and status = 'confirmed'
                    """,
                    session["id"],
                )

                if booked_count >= session["capacity"]:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=ApiResponse(
                            success=False,
                            message="class is full",
                            error_code="CLASS_FULL",
                        ).model_dump(),
                    )

                existing_confirmed_booking = await conn.fetchval(
                    """
                    select exists(
                      select 1
                      from bookings
                      where user_id = $1
                        and session_id = $2
                        and status = 'confirmed'
                    )
                    """,
                    user_id,
                    session["id"],
                )

                if existing_confirmed_booking:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=ApiResponse(
                            success=False,
                            message="You already booked this class.",
                            error_code="ALREADY_BOOKED",
                        ).model_dump(),
                    )

                await conn.execute(
                    """
                    insert into bookings (user_id, session_id, location_id, status)
                    values ($1, $2, $3, 'confirmed')
                    on conflict (user_id, session_id)
                    do update set location_id = $3, status = 'confirmed', cancelled_at = null
                    """,
                    user_id,
                    session["id"],
                    request.location_id,
                )
    except asyncpg.exceptions.ForeignKeyViolationError as exc:
        logger.warning("Booking failed due to foreign key constraint: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ApiResponse(
                success=False,
                message="class session or location not found",
                error_code="BOOKING_REFERENCE_NOT_FOUND",
            ).model_dump(),
        ) from exc
    except asyncpg.exceptions.InvalidTextRepresentationError as exc:
        logger.warning("Booking failed due to invalid identifier format: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ApiResponse(
                success=False,
                message="invalid class or location identifier",
                error_code="INVALID_IDENTIFIER",
            ).model_dump(),
        ) from exc
    except (
        asyncpg.exceptions.UndefinedColumnError,
        asyncpg.exceptions.UndefinedTableError,
    ) as exc:
        logger.error("Booking failed due to missing database objects (migration drift): %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=ApiResponse(
                success=False,
                message="booking is temporarily unavailable; database migration required",
                error_code="BOOKING_TEMPORARILY_UNAVAILABLE",
            ).model_dump(),
        ) from exc

    return ApiResponse(success=True, message="Booking confirmed")


@app.post("/bookings/cancel", response_model=ApiResponse)
async def cancel_booking(request: CancelBookingRequest, user_id: str = Depends(get_user_id)) -> ApiResponse:
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
                detail=ApiResponse(
                    success=False,
                    message="active booking not found",
                    error_code="BOOKING_NOT_FOUND",
                ).model_dump(),
            )

        if isinstance(scheduled_at, datetime):
            now = datetime.now(timezone.utc)
            if scheduled_at.tzinfo is None:
                scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
            if (scheduled_at - now).total_seconds() <= 2 * 60 * 60:
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail=ApiResponse(
                        success=False,
                        message="cancellation window closed",
                        error_code="CANCELLATION_WINDOW_CLOSED",
                    ).model_dump(),
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
