#!/usr/bin/env python3
"""
Simple HTTP server for testing the Fantasy Playoff Calculator locally.
Run this script and open http://localhost:8000/playoff_calculator.html
"""

import http.server
import socketserver
import os

PORT = 8000

# Change to the script's directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

Handler = http.server.SimpleHTTPRequestHandler

print(f"Starting server at http://localhost:{PORT}")
print(f"Open http://localhost:{PORT}/playoff_calculator.html in your browser")
print("Press Ctrl+C to stop the server")

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
