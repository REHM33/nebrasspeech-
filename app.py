from flask import Flask, render_template
from database import db
from auth import auth_bp

# يخلي /css /js /images تشتغل مثل قبل
app = Flask(__name__, static_folder="static", static_url_path="/")

# اتصال MySQL (XAMPP)
app.config["SQLALCHEMY_DATABASE_URI"] = "mysql+pymysql://root:@localhost/nebras_db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

# API
app.register_blueprint(auth_bp)

# صفحات الموقع
@app.route("/")
def index():
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

@app.route("/upload")
def upload_page():
    return render_template("upload.html")

@app.route("/sessions")
def sessions_page():
    return render_template("sessions.html")

@app.route("/live")
def live_page():
    return render_template("live.html")

if __name__ == "__main__":
    app.run(debug=True)