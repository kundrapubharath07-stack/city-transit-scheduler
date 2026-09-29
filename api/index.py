import os
import sys

# Add root project directory to sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from server import TransitRequestHandler, wsgi_app, app, application

# Vercel's Python runtime searches for `app`, `application`, or `handler`
handler = app

