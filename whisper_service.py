from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
import secrets
import hashlib

from werkzeug.security import generate_password_hash, check_password_hash

from database import db, User, AuthToken, log_action

auth_bp = Blueprint("auth", __name__)

TOKEN_DAYS = 7


def _hash_token(raw_token: str) -> str:
    # SHA-256 hex 64 chars (مطابق لعمود token_hash CHAR(64))
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def _get_user_from_auth_header():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    raw = auth.replace("Bearer ", "", 1).strip()
    if not raw:
        return None

    token_hash = _hash_token(raw)

    token_row = AuthToken.query.filter_by(token_hash=token_hash).first()
    if not token_row:
        return None
    if token_row.revoked_at is not None:
        return None
    if token_row.expires_at <= datetime.utcnow():
        return None

    user = User.query.get(token_row.user_id)
    return user


@auth_bp.route("/api/register", methods=["POST"])
def api_register():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not username or not email or not password:
        return jsonify({"error": "Missing required fields"}), 400
    if len(username) < 3:
        return jsonify({"error": "Username must be at least 3 characters"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists"}), 409
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already exists"}), 409

    new_user = User(
        username=username,
        email=email,
        password_hash=generate_password_hash(password),  # PBKDF2
        created_at=datetime.utcnow(),
    )
    db.session.add(new_user)
    db.session.commit()

    # Audit
    log_action(
        action="USER_REGISTER",
        user_id=new_user.id,
        entity_type="user",
        entity_id=new_user.id,
        ip_address=request.remote_addr,
        user_agent=request.headers.get("User-Agent"),
        details={"email": new_user.email, "username": new_user.username},
    )

    return jsonify({"message": "Account created successfully"}), 201


@auth_bp.route("/api/login", methods=["POST"])
def api_login():
    data = request.get_json(silent=True) or {}
    username_or_email = (data.get("username") or data.get("email") or "").strip()
    password = data.get("password") or ""

    if not username_or_email or not password:
        return jsonify({"error": "Missing required fields"}), 400

    user = User.query.filter_by(username=username_or_email).first()
    if not user:
        user = User.query.filter_by(email=username_or_email.lower()).first()

    if not user:
        log_action(
            action="LOGIN_FAILED",
            user_id=None,
            entity_type="user",
            entity_id=None,
            ip_address=request.remote_addr,
            user_agent=request.headers.get("User-Agent"),
            details={"reason": "user_not_found", "login": username_or_email},
        )
        return jsonify({"error": "User not found"}), 404

    if not check_password_hash(user.password_hash, password):
        log_action(
            action="LOGIN_FAILED",
            user_id=user.id,
            entity_type="user",
            entity_id=user.id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get("User-Agent"),
            details={"reason": "wrong_password"},
        )
        return jsonify({"error": "Invalid credentials"}), 401

    user.last_login_at = datetime.utcnow()
    db.session.commit()

    # اصدار توكن وتخزين هاشه في DB
    raw_token = secrets.token_urlsafe(32)
    token_hash = _hash_token(raw_token)

    token_row = AuthToken(
        user_id=user.id,
        token_hash=token_hash,
        device_name="web",
        ip_address=request.remote_addr,
        user_agent=request.headers.get("User-Agent"),
        expires_at=datetime.utcnow() + timedelta(days=TOKEN_DAYS),
        created_at=datetime.utcnow(),
    )
    db.session.add(token_row)
    db.session.commit()

    log_action(
        action="LOGIN_SUCCESS",
        user_id=user.id,
        entity_type="user",
        entity_id=user.id,
        ip_address=request.remote_addr,
        user_agent=request.headers.get("User-Agent"),
        details={"expires_days": TOKEN_DAYS},
    )

    return jsonify({
        "token": raw_token,
        "user": {"id": user.id, "username": user.username, "email": user.email}
    }), 200


@auth_bp.route("/api/me", methods=["GET"])
def api_me():
    user = _get_user_from_auth_header()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify({
        "id": user.id,
        "username": user.username,
        "email": user.email
    }), 200


@auth_bp.route("/api/logout", methods=["POST"])
def api_logout():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return jsonify({"error": "Unauthorized"}), 401
    raw = auth.replace("Bearer ", "", 1).strip()
    if not raw:
        return jsonify({"error": "Unauthorized"}), 401

    token_hash = _hash_token(raw)
    token_row = AuthToken.query.filter_by(token_hash=token_hash).first()
    if not token_row:
        return jsonify({"message": "OK"}), 200

    token_row.revoked_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"message": "Logged out"}), 200