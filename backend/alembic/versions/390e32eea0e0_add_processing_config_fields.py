"""add_processing_config_fields

Revision ID: 390e32eea0e0
Revises: 79281f9e200a
Create Date: 2025-12-01 02:23:02.607482

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '390e32eea0e0'
down_revision: Union[str, None] = '79281f9e200a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new columns to processing_configs table
    op.add_column('processing_configs', sa.Column('embedding_batch_size', sa.Integer(), nullable=False, server_default='4'))
    op.add_column('processing_configs', sa.Column('max_concurrent_requests', sa.Integer(), nullable=False, server_default='5'))
    op.add_column('processing_configs', sa.Column('requests_per_minute', sa.Integer(), nullable=False, server_default='60'))
    op.add_column('processing_configs', sa.Column('tokens_per_minute', sa.Integer(), nullable=False, server_default='100000'))
    op.add_column('processing_configs', sa.Column('max_retries', sa.Integer(), nullable=False, server_default='3'))
    op.add_column('processing_configs', sa.Column('retry_delay_seconds', sa.Integer(), nullable=False, server_default='5'))


def downgrade() -> None:
    # Remove added columns
    op.drop_column('processing_configs', 'retry_delay_seconds')
    op.drop_column('processing_configs', 'max_retries')
    op.drop_column('processing_configs', 'tokens_per_minute')
    op.drop_column('processing_configs', 'requests_per_minute')
    op.drop_column('processing_configs', 'max_concurrent_requests')
    op.drop_column('processing_configs', 'embedding_batch_size')
