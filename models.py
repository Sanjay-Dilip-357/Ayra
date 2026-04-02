# models.py - Database Models using SQLAlchemy
import uuid
import json as json_lib
from sqlalchemy import Index
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    phone = db.Column(db.String(15))
    phone_verified = db.Column(db.Boolean, default=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='user')  # 'super_admin', 'admin', or 'user'
    is_active = db.Column(db.Boolean, default=True)
    is_approved = db.Column(db.Boolean, default=False)  # Requires admin approval
    approved_at = db.Column(db.DateTime)
    approved_by = db.Column(db.String(36)) 
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(36))  # ID of the user who created this account
    last_login = db.Column(db.DateTime)
    
    __table_args__ = (
        Index('ix_users_email_lower', db.func.lower(email)),
        Index('ix_users_role_active', role, is_active),
    )
    # Relationship with drafts
    drafts = db.relationship('Draft', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def is_super_admin(self):
        return self.role == 'super_admin'
    
    def is_admin(self):
        return self.role in ['super_admin', 'admin']
    
    def can_manage_admins(self):
        return self.role == 'super_admin'
    
    def can_manage_users(self):
        return self.role in ['super_admin', 'admin']
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'phone_verified': self.phone_verified,
            'role': self.role,
            'role_display': self.get_role_display(),
            'is_active': self.is_active,
            'is_approved': self.is_approved,  # Add to dict
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'created_by': self.created_by,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }

    
    def get_role_display(self):
        role_names = {
            'super_admin': 'Super Administrator',
            'admin': 'Administrator',
            'user': 'User'
        }
        return role_names.get(self.role, 'Unknown')
    
    @staticmethod
    def get_by_email(email):
        return User.query.filter(db.func.lower(User.email) == email.lower()).first()
    
    @staticmethod
    def super_admin_exists():
        return User.query.filter_by(role='super_admin').first() is not None
    
    @staticmethod
    def admin_exists():
        return User.query.filter(User.role.in_(['super_admin', 'admin'])).first() is not None

class Draft(db.Model):
    __tablename__ = 'drafts'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    template_type = db.Column(db.String(50), nullable=False)
    template_name = db.Column(db.String(100))
    old_name = db.Column(db.String(200))
    _replacements = db.Column('replacements', db.Text)
    _preview_data = db.Column('preview_data', db.Text)
    _generated_files = db.Column('generated_files', db.Text)
    status = db.Column(db.String(20), default='draft', index=True)
    output_folder = db.Column(db.String(500))
    published = db.Column(db.Boolean, default=False)
    published_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    modified_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    approved_at = db.Column(db.DateTime)
    generated_at = db.Column(db.DateTime)
    
    # FIX: JSON properties with safe deserialization
    @property
    def replacements(self):
        if not self._replacements:
            return {}
        # Check if it's already a dict (PostgreSQL might return this way)
        if isinstance(self._replacements, dict):
            return self._replacements
        # Otherwise parse the JSON string
        try:
            return json_lib.loads(self._replacements)
        except (json_lib.JSONDecodeError, TypeError):
            return {}
    
    @replacements.setter
    def replacements(self, value):
        if value is None:
            self._replacements = None
        elif isinstance(value, str):
            self._replacements = value
        else:
            self._replacements = json_lib.dumps(value)
    
    @property
    def preview_data(self):
        if not self._preview_data:
            return {}
        if isinstance(self._preview_data, dict):
            return self._preview_data
        try:
            return json_lib.loads(self._preview_data)
        except (json_lib.JSONDecodeError, TypeError):
            return {}
    
    @preview_data.setter
    def preview_data(self, value):
        if value is None:
            self._preview_data = None
        elif isinstance(value, str):
            self._preview_data = value
        else:
            self._preview_data = json_lib.dumps(value)
    
    @property
    def generated_files(self):
        if not self._generated_files:
            return []
        if isinstance(self._generated_files, list):
            return self._generated_files
        try:
            return json_lib.loads(self._generated_files)
        except (json_lib.JSONDecodeError, TypeError):
            return []
    
    @generated_files.setter
    def generated_files(self, value):
        if value is None:
            self._generated_files = None
        elif isinstance(value, str):
            self._generated_files = value
        else:
            self._generated_files = json_lib.dumps(value)
    
    def to_dict(self):
        """Serialize draft to dictionary - Safe for both SQLite and PostgreSQL"""
        try:
            return {
                'id': str(self.id),
                'user_id': str(self.user_id),
                'user_name': self.user.name if self.user else 'Unknown',
                'user_email': self.user.email if self.user else '',
                'template_type': self.template_type or '',
                'template_name': self.template_name or '',
                'old_name': self.old_name or '',
                'replacements': self.replacements,  # Already returns dict
                'preview_data': self.preview_data,  # Already returns dict
                'status': self.status or 'draft',
                'output_folder': self.output_folder or '',
                'generated_files': self.generated_files,  # Already returns list
                'created_at': self.created_at.isoformat() if self.created_at else None,
                'modified_at': self.modified_at.isoformat() if self.modified_at else None,
                'approved_at': self.approved_at.isoformat() if self.approved_at else None,
                'generated_at': self.generated_at.isoformat() if self.generated_at else None,
            }
        except Exception as e:
            print(f"❌ Error serializing draft {self.id}: {e}")
            import traceback
            traceback.print_exc()
            return {
                'id': str(self.id),
                'error': str(e),
                'user_name': 'Error',
                'template_type': self.template_type or '',
                'status': self.status or 'error',
                'replacements': {},
                'preview_data': {},
                'generated_files': []
            }

# class Draft(db.Model):
#     __tablename__ = 'drafts'
    
#     id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
#     user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
#     template_type = db.Column(db.String(50), nullable=False)
#     template_name = db.Column(db.String(100))
#     old_name = db.Column(db.String(200))
#     replacements = db.Column(db.JSON)
#     preview_data = db.Column(db.JSON)
#     status = db.Column(db.String(20), default='draft', index=True)
#     output_folder = db.Column(db.String(500))
#     generated_files = db.Column(db.JSON)
#     published = db.Column(db.Boolean, default=False)
#     published_at = db.Column(db.DateTime)
#     created_at = db.Column(db.DateTime, default=datetime.utcnow)
#     modified_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
#     approved_at = db.Column(db.DateTime)
#     generated_at = db.Column(db.DateTime)
    
#     def to_dict(self):
#         return {
#             'id': self.id,
#             'user_id': self.user_id,
#             'user_name': self.user.name if self.user else None,
#             'template_type': self.template_type,
#             'template_name': self.template_name,
#             'old_name': self.old_name,
#             'replacements': self.replacements,
#             'preview_data': self.preview_data,
#             'status': self.status,
#             'output_folder': self.output_folder,
#             'generated_files': self.generated_files,
#             'created_at': self.created_at.isoformat() if self.created_at else None,
#             'modified_at': self.modified_at.isoformat() if self.modified_at else None,
#             'approved_at': self.approved_at.isoformat() if self.approved_at else None,
#             'generated_at': self.generated_at.isoformat() if self.generated_at else None
#         }


class PhoneTracking(db.Model):
    __tablename__ = 'phone_tracking'
    
    id = db.Column(db.Integer, primary_key=True)
    phone = db.Column(db.String(15), unique=True, nullable=False)
    is_used = db.Column(db.Boolean, default=False)
    used_at = db.Column(db.DateTime)
    
    def to_dict(self):
        return {
            'phone': self.phone,
            'is_used': self.is_used,
            'used_at': self.used_at.isoformat() if self.used_at else None
        }


def init_db(app):
    """Initialize database and create tables"""
    db.init_app(app)
    with app.app_context():
        db.create_all()
        print("Database initialized successfully!")
