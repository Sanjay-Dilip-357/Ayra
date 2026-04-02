# migrate_db.py - Complete Database Migration Script
import os
import sys

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from sqlalchemy import text, inspect

def get_existing_columns(table_name):
    """Get list of existing columns in a table"""
    with app.app_context():
        inspector = inspect(db.engine)
        columns = [col['name'] for col in inspector.get_columns(table_name)]
        return columns

def add_column_if_not_exists(table_name, column_name, column_type, default=None):
    """Add a column to table if it doesn't exist"""
    with app.app_context():
        existing_columns = get_existing_columns(table_name)
        
        if column_name in existing_columns:
            print(f"  ⏭️  Column '{column_name}' already exists in '{table_name}'")
            return False
        
        try:
            # Build SQL based on column type and default
            if default is not None:
                if isinstance(default, bool):
                    default_val = '1' if default else '0'
                    sql = f'ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type} DEFAULT {default_val}'
                elif isinstance(default, str):
                    sql = f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type} DEFAULT '{default}'"
                else:
                    sql = f'ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type} DEFAULT {default}'
            else:
                sql = f'ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}'
            
            db.session.execute(text(sql))
            db.session.commit()
            print(f"  ✅ Added column '{column_name}' to '{table_name}'")
            return True
            
        except Exception as e:
            print(f"  ❌ Error adding '{column_name}' to '{table_name}': {e}")
            db.session.rollback()
            return False

def migrate():
    """Run all migrations"""
    print("\n" + "="*60)
    print("🚀 DATABASE MIGRATION SCRIPT")
    print("="*60 + "\n")
    
    with app.app_context():
        print(f"📊 Database: {db.engine.url}\n")
        
        # ==================== USERS TABLE ====================
        print("📋 Migrating 'users' table...")
        
        add_column_if_not_exists('users', 'is_approved', 'BOOLEAN', False)
        add_column_if_not_exists('users', 'approved_at', 'DATETIME', None)
        add_column_if_not_exists('users', 'approved_by', 'VARCHAR(36)', None)
        add_column_if_not_exists('users', 'phone_verified', 'BOOLEAN', False)
        add_column_if_not_exists('users', 'created_by', 'VARCHAR(36)', None)
        
        print()
        
        # ==================== DRAFTS TABLE ====================
        print("📋 Migrating 'drafts' table...")
        
        add_column_if_not_exists('drafts', 'published', 'BOOLEAN', False)
        add_column_if_not_exists('drafts', 'published_at', 'DATETIME', None)
        
        print()
        
        # ==================== UPDATE EXISTING DATA ====================
        print("📋 Updating existing data...")
        
        try:
            # Set all existing admins/super_admins as approved
            db.session.execute(text("""
                UPDATE users 
                SET is_approved = 1 
                WHERE role IN ('admin', 'super_admin')
            """))
            db.session.commit()
            print("  ✅ Set all admins as approved")
        except Exception as e:
            print(f"  ⚠️ Could not update admins: {e}")
            db.session.rollback()
        
        try:
            # Set all existing regular users as approved (so they can still login)
            db.session.execute(text("""
                UPDATE users 
                SET is_approved = 1 
                WHERE role = 'user' AND is_approved IS NULL
            """))
            db.session.commit()
            print("  ✅ Set existing users as approved")
        except Exception as e:
            print(f"  ⚠️ Could not update users: {e}")
            db.session.rollback()
        
        try:
            # Set all existing drafts as unpublished
            db.session.execute(text("""
                UPDATE drafts 
                SET published = 0 
                WHERE published IS NULL
            """))
            db.session.commit()
            print("  ✅ Set all drafts as unpublished")
        except Exception as e:
            print(f"  ⚠️ Could not update drafts: {e}")
            db.session.rollback()
        
        print("\n" + "="*60)
        print("🎉 MIGRATION COMPLETE!")
        print("="*60 + "\n")
        
        # Show current table structures
        print("📊 Current Table Structures:\n")
        
        print("USERS table columns:")
        for col in get_existing_columns('users'):
            print(f"  - {col}")
        
        print("\nDRAFTS table columns:")
        for col in get_existing_columns('drafts'):
            print(f"  - {col}")
        
        print()

if __name__ == '__main__':
    migrate()