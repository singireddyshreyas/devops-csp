from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "SupportDesk API"
    database_url: str = "postgresql+psycopg://supportdesk:supportdesk@localhost:5432/supportdesk"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
