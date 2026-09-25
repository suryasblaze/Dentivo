"""Run the API locally:  python server/run.py"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app  # noqa: E402
from app.db import create_all  # noqa: E402

app = create_app()

if __name__ == "__main__":
    if "--init-db" in sys.argv:
        create_all()
        print("Tables created.")
        sys.exit(0)
    app.run(port=int(os.environ.get("PORT", 5001)), debug=True)
