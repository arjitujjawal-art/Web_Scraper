#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys
import mimetypes

# Explicitly register JS and CSS mime types for browser compatibility
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('application/javascript', '.mjs')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('text/html', '.html')

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), format % args))

    def end_headers(self):
        # Enable CORS and caching headers for local dev
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

def run_server(port=PORT):
    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("0.0.0.0", port), Handler) as httpd:
            print(f"🚀 Signal Atlas server running at http://localhost:{port}")
            print(f"📁 Serving directory: {DIRECTORY}")
            sys.stdout.flush()
            httpd.serve_forever()
    except OSError as e:
        if e.errno == 48: # Address in use
            print(f"Port {port} in use, trying {port + 1}...")
            run_server(port + 1)
        else:
            raise e

if __name__ == "__main__":
    run_server()
