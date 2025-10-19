from flask import Flask
from flask_cors import CORS
from .route import bp

def create_app():
    app = Flask(__name__)
    CORS(app) # allow frontend requests

    app.register_blueprint(bp, url_prefix="/api")
    return app