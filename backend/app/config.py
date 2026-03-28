from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    port: int = Field(default=8080, validation_alias="PORT")
    database_url: str = Field(validation_alias="DATABASE_URL")
    supabase_jwt_secret: str = Field(validation_alias="SUPABASE_JWT_SECRET")

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, populate_by_name=True)


@lru_cache
def get_settings() -> Settings:
    return Settings()
