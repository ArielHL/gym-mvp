from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    port: int = Field(default=8080, validation_alias="PORT")
    database_url: str = Field(validation_alias="DATABASE_URL")
    database_url_fallback: str | None = Field(default=None, validation_alias="DATABASE_URL_FALLBACK")
    supabase_jwt_secret: str = Field(validation_alias="SUPABASE_JWT_SECRET")
    supabase_url: str | None = Field(default=None, validation_alias="SUPABASE_URL")
    supabase_jwt_audience: str = Field(default="authenticated", validation_alias="SUPABASE_JWT_AUDIENCE")

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, populate_by_name=True)

    def database_urls(self) -> list[str]:
        urls = [self.database_url]
        if self.database_url_fallback:
            urls.append(self.database_url_fallback)
        return urls



   


@lru_cache
def get_settings() -> Settings:
    # Values are loaded from environment/.env at runtime.
    return Settings()  # type: ignore[call-arg]
