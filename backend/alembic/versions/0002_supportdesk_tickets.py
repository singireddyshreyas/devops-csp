"""Convert the starter tasks table into SupportDesk tickets."""

from alembic import op
import sqlalchemy as sa


revision = "0002_supportdesk_tickets"
down_revision = "0001_create_tasks"
branch_labels = None
depends_on = None


def upgrade():
    # The first repository version created ``tasks``. Rename it so existing
    # local databases can upgrade without losing their records.
    inspector = sa.inspect(op.get_bind())
    if "tasks" not in inspector.get_table_names():
        return

    op.rename_table("tasks", "tickets")
    op.alter_column("tickets", "title", new_column_name="subject")
    op.add_column(
        "tickets",
        sa.Column("category", sa.String(length=30), nullable=False, server_default="GENERAL"),
    )
    op.add_column(
        "tickets",
        sa.Column("requester", sa.String(length=120), nullable=False, server_default="Customer"),
    )
    op.add_column("tickets", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True))
    op.execute(
        sa.text(
            "UPDATE tickets SET status = CASE "
            "WHEN status = 'TODO' THEN 'OPEN' "
            "WHEN status = 'DONE' THEN 'RESOLVED' "
            "ELSE status END"
        )
    )
    op.execute(sa.text("UPDATE tickets SET updated_at = created_at"))
    op.alter_column("tickets", "updated_at", nullable=False)


def downgrade():
    inspector = sa.inspect(op.get_bind())
    if "tickets" not in inspector.get_table_names():
        return

    op.drop_column("tickets", "updated_at")
    op.drop_column("tickets", "requester")
    op.drop_column("tickets", "category")
    op.alter_column("tickets", "subject", new_column_name="title")
    op.execute(
        sa.text(
            "UPDATE tickets SET status = CASE "
            "WHEN status = 'OPEN' THEN 'TODO' "
            "WHEN status = 'RESOLVED' THEN 'DONE' "
            "ELSE status END"
        )
    )
    op.rename_table("tickets", "tasks")
