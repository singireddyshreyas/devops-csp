from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

Status = Literal["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED"]
Priority = Literal["LOW", "MEDIUM", "HIGH", "URGENT"]
Category = Literal["TECHNICAL", "BILLING", "ACCOUNT", "GENERAL"]


class TicketCreate(BaseModel):
    subject: str = Field(min_length=1, max_length=200)
    description: str = ""
    priority: Priority = "MEDIUM"
    status: Status = "OPEN"
    category: Category = "GENERAL"
    requester: str = Field(default="Customer", min_length=1, max_length=120)
    assignee: str = "Unassigned"


class TicketUpdate(BaseModel):
    subject: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    priority: Priority | None = None
    status: Status | None = None
    category: Category | None = None
    requester: str | None = Field(default=None, min_length=1, max_length=120)
    assignee: str | None = None


class TicketOut(TicketCreate):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class StatsOut(BaseModel):
    total: int
    open: int
    inProgress: int
    waiting: int
    resolved: int
