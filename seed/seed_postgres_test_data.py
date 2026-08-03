from __future__ import annotations

import asyncio
import os
from dataclasses import dataclass
from datetime import datetime, time, timedelta, timezone
from pathlib import Path
from typing import Iterable

import asyncpg


@dataclass(frozen=True)
class TemplateSeed:
    title: str
    description: str
    trainer_name: str
    exercise_type: str
    duration_minutes: int
    day_of_week: int
    start_time: time
    capacity: int
    difficulty_level: str
    location: str


def load_database_url() -> str:
    env_path = Path(__file__).resolve().parents[1] / "backend" / ".env"
    if not env_path.exists():
        raise RuntimeError(f"Missing env file: {env_path}")

    env_values: dict[str, str] = {}
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env_values[key.strip()] = value.strip()

    database_url = env_values.get("DATABASE_URL") or os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set in backend/.env")

    if "sslmode=" not in database_url:
        separator = "&" if "?" in database_url else "?"
        database_url = f"{database_url}{separator}sslmode=require"

    return database_url


def upcoming_datetimes(day_of_week: int, start_time: time, weeks: int = 3) -> Iterable[datetime]:
    now_utc = datetime.now(timezone.utc)
    base_date = now_utc.date()
    days_ahead = (day_of_week - base_date.weekday()) % 7
    first_date = base_date + timedelta(days=days_ahead)

    for week in range(weeks):
        class_date = first_date + timedelta(days=7 * week)
        dt = datetime.combine(class_date, start_time, tzinfo=timezone.utc)
        if dt > now_utc:
            yield dt


async def seed() -> None:
    dsn = load_database_url()
    conn = await asyncpg.connect(dsn=dsn)

    try:
        profiles = await conn.fetch("select id from public.profiles order by created_at asc")
        if not profiles:
            raise RuntimeError(
                "No rows found in public.profiles. Create at least one authenticated user before seeding."
            )

        creator_id = profiles[0]["id"]
        user_ids = [row["id"] for row in profiles]

        templates = [
            TemplateSeed(
                title="Morning HIIT Blast",
                description="High-intensity intervals to boost cardio and burn calories.",
                trainer_name="Alex Rivera",
                exercise_type="HIIT",
                duration_minutes=45,
                day_of_week=0,
                start_time=time(7, 0),
                capacity=20,
                difficulty_level="intermediate",
                location="Studio A",
            ),
            TemplateSeed(
                title="Power Yoga Flow",
                description="Dynamic yoga focused on strength, mobility, and breath.",
                trainer_name="Maya Chen",
                exercise_type="Yoga",
                duration_minutes=60,
                day_of_week=1,
                start_time=time(18, 0),
                capacity=18,
                difficulty_level="beginner",
                location="Studio B",
            ),
            TemplateSeed(
                title="Strength Fundamentals",
                description="Coach-led resistance training with barbell and dumbbell basics.",
                trainer_name="Jordan Blake",
                exercise_type="Strength",
                duration_minutes=50,
                day_of_week=2,
                start_time=time(17, 30),
                capacity=16,
                difficulty_level="beginner",
                location="Weight Room",
            ),
            TemplateSeed(
                title="Cycling Endurance",
                description="Rhythm-based cycling to improve endurance and pacing.",
                trainer_name="Sofia Malik",
                exercise_type="Cycling",
                duration_minutes=40,
                day_of_week=3,
                start_time=time(6, 30),
                capacity=24,
                difficulty_level="intermediate",
                location="Spin Room",
            ),
            TemplateSeed(
                title="Advanced Core Lab",
                description="Core-focused session with progressive stability challenges.",
                trainer_name="Noah Grant",
                exercise_type="Core",
                duration_minutes=35,
                day_of_week=4,
                start_time=time(19, 15),
                capacity=14,
                difficulty_level="advanced",
                location="Studio C",
            ),
        ]

        template_rows: list[asyncpg.Record] = []
        for template in templates:
            row = await conn.fetchrow(
                """
                insert into public.class_templates (
                  title, description, trainer_name, exercise_type, duration_minutes,
                  day_of_week, start_time, capacity, difficulty_level, location,
                  is_active, created_by
                )
                values ($1, $2, $3, $4, $5, $6, $7, $8, $9::difficulty_level, $10, true, $11)
                on conflict do nothing
                returning id, day_of_week, start_time, capacity
                """,
                template.title,
                template.description,
                template.trainer_name,
                template.exercise_type,
                template.duration_minutes,
                template.day_of_week,
                template.start_time,
                template.capacity,
                template.difficulty_level,
                template.location,
                creator_id,
            )
            if row:
                template_rows.append(row)

        # Include existing templates too, to make data useful immediately.
        all_templates = await conn.fetch(
            """
            select id, day_of_week, start_time, capacity
            from public.class_templates
            where is_active = true
            """
        )

        inserted_sessions = 0
        for template in all_templates:
            for scheduled_at in upcoming_datetimes(template["day_of_week"], template["start_time"], weeks=3):
                result = await conn.execute(
                    """
                    insert into public.class_sessions (template_id, scheduled_at, capacity, status)
                    values ($1, $2, $3, 'scheduled')
                    on conflict (template_id, scheduled_at) do nothing
                    """,
                    template["id"],
                    scheduled_at,
                    template["capacity"],
                )
                if result.endswith("1"):
                    inserted_sessions += 1

        available_sessions = await conn.fetch(
            """
            select cs.id, cs.scheduled_at
            from public.class_sessions cs
            where cs.status = 'scheduled'
              and cs.scheduled_at > now()
            order by cs.scheduled_at asc
            limit 40
            """
        )

        if not available_sessions:
            raise RuntimeError("No future sessions available after seeding class_sessions.")

        max_bookings = min(len(user_ids) * 4, len(available_sessions))
        inserted_or_updated_bookings = 0

        for idx in range(max_bookings):
            user_id = user_ids[idx % len(user_ids)]
            session = available_sessions[idx]
            status = "cancelled" if idx % 5 == 0 else "confirmed"
            cancelled_at = datetime.now(timezone.utc) if status == "cancelled" else None

            result = await conn.execute(
                """
                insert into public.bookings (user_id, session_id, status, cancelled_at)
                values ($1, $2, $3::booking_status, $4)
                on conflict (user_id, session_id)
                do update set
                  status = excluded.status,
                  cancelled_at = excluded.cancelled_at,
                  updated_at = now()
                """,
                user_id,
                session["id"],
                status,
                cancelled_at,
            )
            if result.startswith("INSERT") or result.startswith("UPDATE"):
                inserted_or_updated_bookings += 1

        totals = await conn.fetchrow(
            """
            select
              (select count(*) from public.class_templates) as templates_count,
              (select count(*) from public.class_sessions) as sessions_count,
              (select count(*) from public.bookings) as bookings_count,
              (select count(*) from public.bookings where status = 'confirmed') as confirmed_count,
              (select count(*) from public.bookings where status = 'cancelled') as cancelled_count
            """
        )

        print("Seed completed.")
        print(f"Profiles available: {len(user_ids)}")
        print(f"Templates inserted this run: {len(template_rows)}")
        print(f"Sessions inserted this run: {inserted_sessions}")
        print(f"Bookings upserted this run: {inserted_or_updated_bookings}")
        print(
            "Totals -> "
            f"templates={totals['templates_count']}, "
            f"sessions={totals['sessions_count']}, "
            f"bookings={totals['bookings_count']}, "
            f"confirmed={totals['confirmed_count']}, "
            f"cancelled={totals['cancelled_count']}"
        )
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(seed())
