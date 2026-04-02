# migrate_published.py
import os
import sys

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from sqlalchemy import text

def migrate():
    with app.app_context():
        # Check database type
        is_sqlite = 'sqlite' in str(db.engine.url)
        
        print(f"Database: {db.engine.url}")
        print(f"Is SQLite: {is_sqlite}")
        
        # Add published column
        try:
            if is_sqlite:
                db.session.execute(text('ALTER TABLE drafts ADD COLUMN published BOOLEAN DEFAULT 0'))
            else:
                db.session.execute(text('ALTER TABLE drafts ADD COLUMN published BOOLEAN DEFAULT FALSE'))
            db.session.commit()
            print("✅ Added 'published' column")
        except Exception as e:
            print(f"⚠️ 'published' column might already exist: {e}")
            db.session.rollback()
        
        # Add published_at column
        try:
            db.session.execute(text('ALTER TABLE drafts ADD COLUMN published_at DATETIME'))
            db.session.commit()
            print("✅ Added 'published_at' column")
        except Exception as e:
            print(f"⚠️ 'published_at' column might already exist: {e}")
            db.session.rollback()
        
        print("\n🎉 Migration complete!")

if __name__ == '__main__':
    migrate()