import os
import uuid
from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_cors import CORS
from werkzeug.utils import secure_filename

from database import db, Session, SessionFile, log_action
from auth import auth_bp
from whisper_service import transcribe_audio

app = Flask(__name__, static_folder="static", static_url_path="", template_folder="templates")
CORS(app)

MYSQL_HOST = os.environ.get("MYSQLHOST", "localhost")
MYSQL_PORT = os.environ.get("MYSQLPORT", "3306")
MYSQL_USER = os.environ.get("MYSQLUSER", "root")
MYSQL_PASSWORD = os.environ.get("MYSQLPASSWORD", "")
MYSQL_DATABASE = os.environ.get("MYSQLDATABASE", "railway")

database_url = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}?charset=utf8mb4"

app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-key")

db.init_app(app)

with app.app_context():
    db.create_all()

app.register_blueprint(auth_bp)

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {"wav", "mp3", "ogg", "m4a", "webm", "flac"}


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def save_uploaded_file(file_storage):
    original_name = secure_filename(file_storage.filename or "audio")
    ext = os.path.splitext(original_name)[1].lower()

    if ext.replace(".", "") not in ALLOWED_EXTENSIONS:
        ext = ".wav"

    stored_name = f"{uuid.uuid4().hex}{ext}"
    stored_path = os.path.join(UPLOAD_DIR, stored_name)
    file_storage.save(stored_path)

    if not os.path.exists(stored_path):
        raise FileNotFoundError(f"Saved upload not found: {stored_path}")

    return {
        "original_name": original_name,
        "stored_name": stored_name,
        "stored_path": stored_path,
        "mime_type": file_storage.mimetype,
        "size_bytes": os.path.getsize(stored_path)
    }


def create_session_with_file(user_id, title, transcript, source_type, file_meta, language_code=None):
    session_row = Session(
        user_id=user_id,
        title=title or "Untitled Session",
        transcript=transcript or "",
        source_type=source_type,
        language_code=language_code,
        model_name="whisper",
        status="completed"
    )
    db.session.add(session_row)
    db.session.commit()

    file_row = SessionFile(
        session_id=session_row.id,
        original_name=file_meta.get("original_name"),
        stored_path=file_meta.get("stored_path"),
        mime_type=file_meta.get("mime_type"),
        size_bytes=file_meta.get("size_bytes"),
        duration_seconds=None
    )
    db.session.add(file_row)
    db.session.commit()

    log_action(
        user_id=user_id,
        action="SESSION_CREATE",
        entity_type="session",
        entity_id=session_row.id,
        ip_address=request.remote_addr,
        user_agent=request.user_agent.string if request.user_agent else None,
        details={"source_type": source_type, "title": title}
    )

    return session_row, file_row


from auth import _get_user_from_auth_header


def require_auth():
    return _get_user_from_auth_header()


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/login")
def login_page():
    return render_template("login.html")


@app.route("/register")
def register_page():
    return render_template("register.html")


@app.route("/dashboard")
def dashboard_page():
    return render_template("dashboard.html")


@app.route("/live-page")
@app.route("/live")
def live_page():
    return render_template("live.html")


@app.route("/upload-page")
@app.route("/upload")
def upload_page():
    return render_template("upload.html")


@app.route("/sessions-page")
@app.route("/sessions-view")
@app.route("/sessions")
def sessions_page():
    return render_template("sessions.html")


@app.route("/uploads/<path:filename>")
def uploaded_audio(filename):
    user = require_auth()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    return send_from_directory(UPLOAD_DIR, filename)


@app.route("/upload-transcribe-save", methods=["POST"])
def upload_transcribe_save():
    try:
        user = require_auth()
        if not user:
            return jsonify({"error": "Unauthorized"}), 401

        if "audio" not in request.files:
            return jsonify({"error": "No audio file uploaded."}), 400

        file = request.files["audio"]
        title = (request.form.get("title") or "").strip()

        if file.filename == "":
            return jsonify({"error": "Empty file name."}), 400

        if not allowed_file(file.filename):
            return jsonify({"error": "Unsupported audio type."}), 400

        file_meta = save_uploaded_file(file)
        whisper_result = transcribe_audio(file_meta["stored_path"])

        session_row, file_row = create_session_with_file(
            user_id=user.id,
            title=title or file_meta["original_name"],
            transcript=whisper_result["text"],
            source_type="upload",
            file_meta=file_meta,
            language_code=whisper_result.get("language")
        )

        return jsonify({
            "message": "Upload session saved successfully.",
            "session_id": int(session_row.id),
            "transcription": whisper_result["text"]
        }), 200

    except Exception as e:
        print("UPLOAD ERROR:", str(e))
        return jsonify({"error": str(e)}), 500


@app.route("/api/sessions", methods=["GET"])
def get_sessions():
    try:
        user = require_auth()
        if not user:
            return jsonify({"error": "Unauthorized"}), 401

        rows = (
            db.session.query(Session, SessionFile)
            .outerjoin(SessionFile, Session.id == SessionFile.session_id)
            .filter(Session.user_id == user.id)
            .order_by(Session.created_at.desc())
            .all()
        )

        result = []
        for session_row, file_row in rows:
            audio_url = None
            if file_row and file_row.stored_path:
                audio_filename = os.path.basename(file_row.stored_path)
                audio_url = f"/uploads/{audio_filename}"

            result.append({
                "id": int(session_row.id),
                "title": session_row.title,
                "transcript": session_row.transcript,
                "source_type": session_row.source_type,
                "status": session_row.status,
                "created_at": session_row.created_at.isoformat() if session_row.created_at else None,
                "audio_url": audio_url,
                "audio_name": file_row.original_name if file_row else None
            })

        return jsonify({"sessions": result}), 200

    except Exception as e:
        print("SESSIONS ERROR:", str(e))
        return jsonify({"error": str(e)}), 500


@app.route("/api/sessions/<int:session_id>", methods=["PUT"])
def update_session(session_id):
    try:
        user = require_auth()
        if not user:
            return jsonify({"error": "Unauthorized"}), 401

        session_row = Session.query.filter_by(id=session_id, user_id=user.id).first()
        if not session_row:
            return jsonify({"error": "Session not found"}), 404

        data = request.get_json(silent=True) or {}
        if "title" in data:
            session_row.title = data["title"]
        if "transcript" in data:
            session_row.transcript = data["transcript"]

        db.session.commit()
        return jsonify({"message": "Session updated successfully."}), 200

    except Exception as e:
        print("UPDATE SESSION ERROR:", str(e))
        return jsonify({"error": str(e)}), 500


@app.route("/live-transcribe", methods=["POST"])
def live_transcribe():
    try:
        user = require_auth()
        if not user:
            return jsonify({"error": "Unauthorized"}), 401
        if "audio" not in request.files:
            return jsonify({"error": "No audio file."}), 400
        file = request.files["audio"]
        file_meta = save_uploaded_file(file)
        whisper_result = transcribe_audio(file_meta["stored_path"])
        return jsonify({"transcription": whisper_result["text"]}), 200
    except Exception as e:
        print("LIVE TRANSCRIBE ERROR:", str(e))
        return jsonify({"error": str(e)}), 500


@app.route("/live-final-save", methods=["POST"])
def live_final_save():
    try:
        user = require_auth()
        if not user:
            return jsonify({"error": "Unauthorized"}), 401
        if "audio" not in request.files:
            return jsonify({"error": "No audio file."}), 400
        file = request.files["audio"]
        title = (request.form.get("title") or "").strip()
        transcript = (request.form.get("transcript") or "").strip()
        file_meta = save_uploaded_file(file)
        session_row, _ = create_session_with_file(
            user_id=user.id,
            title=title or "Live Session",
            transcript=transcript,
            source_type="live",
            file_meta=file_meta
        )
        return jsonify({"message": "Live session saved.", "session_id": int(session_row.id)}), 200
    except Exception as e:
        print("LIVE FINAL SAVE ERROR:", str(e))
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
