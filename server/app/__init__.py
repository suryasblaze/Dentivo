"""The Dentivo API.

Runs two ways from the same code:
  · locally           python server/run.py
  · on Vercel         as a serverless function (api/index.py)

Everything lives under /api. Anything under /api/public is reachable without
a login, because it is what a patient's phone opens.
"""
import os

from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS

load_dotenv()


def create_app(database_url: str | None = None) -> Flask:
    app = Flask(__name__)
    app.json.sort_keys = False

    from . import db
    db.init(database_url)

    origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
    CORS(app, resources={r"/api/*": {"origins": origins}}, supports_credentials=False)

    from .routes.auth import bp as auth_bp
    from .routes.clinic import bp as clinic_bp
    from .routes.patients import bp as patients_bp
    from .routes.visits import bp as visits_bp
    from .routes.public import bp as public_bp

    for bp in (auth_bp, clinic_bp, patients_bp, visits_bp, public_bp):
        app.register_blueprint(bp)

    @app.get("/api/health")
    def health():
        return jsonify(ok=True, service="dentivo-api")

    @app.teardown_appcontext
    def close_session(exc=None):
        s = db._Session
        if s is not None:
            if exc is not None:
                s().rollback()
            s.remove()

    @app.errorhandler(404)
    def not_found(_):
        return jsonify(error="Not found"), 404

    @app.errorhandler(500)
    def server_error(_):
        return jsonify(error="Something went wrong at our end"), 500

    return app
