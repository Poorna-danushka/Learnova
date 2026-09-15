"""add notification preferences

Revision ID: a1b2c3d4e568
Revises: c3d4e5f6a789
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a1b2c3d4e568"
down_revision: Union[str, Sequence[str], None] = "c3d4e5f6a789"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "push_notifications_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "reminder_notifications_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "reminder_notifications_enabled")
    op.drop_column("users", "push_notifications_enabled")
