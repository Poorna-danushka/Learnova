from app.database.database import SessionLocal
from app.models import User, Module, Note

db = SessionLocal()
try:
    user = db.query(User).first()
    module = db.query(Module).filter(Module.owner_id == user.id).first()
    print(f'User: {user.id}, Module: {module.id}')
    note = Note(owner_id=user.id, subject_id=module.id, title='Direct Test', content='Direct test content')
    db.add(note)
    db.commit()
    print(f'Note created successfully: {note.id}')
except Exception as e:
    print(f'Error: {e}')
    import traceback
    traceback.print_exc()
    db.rollback()
finally:
    db.close()
