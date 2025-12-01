"""add_openwebui_config_to_projects

Revision ID: 3cefffaadab2
Revises: 390e32eea0e0
Create Date: 2025-12-01 02:37:18.779963

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3cefffaadab2'
down_revision: Union[str, None] = '390e32eea0e0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add openwebui_config_id column to projects table
    op.add_column(
        'projects',
        sa.Column('openwebui_config_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=True)
    )
    
    # Add foreign key constraint
    op.create_foreign_key(
        'fk_projects_openwebui_config',
        'projects',
        'openwebui_configs',
        ['openwebui_config_id'],
        ['id']
    )


def downgrade() -> None:
    # Drop foreign key constraint
    op.drop_constraint('fk_projects_openwebui_config', 'projects', type_='foreignkey')
    
    # Drop openwebui_config_id column
    op.drop_column('projects', 'openwebui_config_id')
