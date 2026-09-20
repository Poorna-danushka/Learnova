"""add explanation to quiz_questions

Revision ID: e2f3a4b5c678
Revises: 42a4d6fa340b
Branch labels: None
Depends on: None
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "e2f3a4b5c678"
down_revision: Union[str, Sequence[str], None] = "42a4d6fa340b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "quiz_questions",
        sa.Column("explanation", sa.String(2000), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("quiz_questions", "explanation")
