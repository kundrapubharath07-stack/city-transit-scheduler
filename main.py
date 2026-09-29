"""
APSRTC Kakinada City Transit & Route Optimizer
Deployment Entrypoint — main.py
"""

import os
import sys
import socketserver

# Ensure UTF-8 output on all platforms
if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Import the server components
from server import TransitRequestHandler, db_manager

# Use PORT from environment variable (required by cloud platforms like Render, Railway, etc.)
# Falls back to 8000 for local development
PORT = int(os.environ.get("PORT", 8000))

if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), TransitRequestHandler) as httpd:
        print("=" * 60)
        print("[*] APSRTC Kakinada Transit & Route Optimizer API Server Running!")
        print(f"[*] Listening on port: {PORT}")
        print(f"[*] Access Web Portal & APIs at: http://localhost:{PORT}")
        print("=" * 60)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")
