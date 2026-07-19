"""Dev-only static server for WW4.

python -m http.server sends no cache headers, so the browser's HTTP cache
happily serves a stale index.html -- which also satisfies the service worker's
network-first fetch(), making edits look like they did nothing. This sends
no-store on everything so a plain reload always shows current code.

Production is unaffected: Netlify serves the real headers via netlify.toml.

    python devserver.py [port]
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        # Quieter than the default one-line-per-asset firehose (79 card images).
        if "favicon" not in (args[0] if args else ""):
            super().log_message(fmt, *args)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5500
    print(f"WW4 dev server (no-store) on http://localhost:{port}")
    ThreadingHTTPServer(("", port), NoCacheHandler).serve_forever()
