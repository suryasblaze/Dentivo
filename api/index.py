"""Vercel entry point.

Vercel turns this file into a serverless function and looks for `app`.
The same Flask application runs locally with `python server/run.py`.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "server"))

from app import create_app  # noqa: E402

app = create_app()
