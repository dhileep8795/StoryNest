from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql://neondb_owner:npg_MwPdbE3G9zcW@ep-divine-cloud-aywjwz0c-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    secret_key: str = "change-me-before-production"
    access_token_expire_minutes: int = 60
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
