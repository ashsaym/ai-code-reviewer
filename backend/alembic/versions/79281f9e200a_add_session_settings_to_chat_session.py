"""add_session_settings_to_chat_session

Revision ID: 79281f9e200a
Revises: 5c3522b80e2b
Create Date: 2025-12-01 01:22:05.454849

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '79281f9e200a'
down_revision: Union[str, None] = '5c3522b80e2b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add session_settings JSON column to chat_sessions table
    op.add_column('chat_sessions', sa.Column('session_settings', sa.JSON(), nullable=True))


def downgrade() -> None:
    # Remove session_settings column
    op.drop_column('chat_sessions', 'session_settings')
