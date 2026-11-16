"""Servidor local de revisión (stdlib). Solo escucha en 127.0.0.1 y rechaza Host/Origin ajenos."""
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from pipeline import workdb
from pipeline.db import store
from pipeline.review import batch

STATIC = Path(__file__).parent / "static" / "index.html"


class _Handler(BaseHTTPRequestHandler):
    work_db: Path
    authoring_db: Path

    def log_message(self, *args):  # silencioso
        pass

    def _json(self, status: int, obj) -> None:
        body = json.dumps(obj, ensure_ascii=False).encode("utf8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _local_only(self) -> bool:
        port = self.server.server_address[1]
        hosts = {f"127.0.0.1:{port}", f"localhost:{port}"}
        origins = {f"http://127.0.0.1:{port}", f"http://localhost:{port}"}
        if self.headers.get("Host", "") not in hosts:
            return False
        origin = self.headers.get("Origin")
        return origin is None or origin in origins

    def do_GET(self):
        if not self._local_only():
            return self._json(403, {"error": "origen no permitido"})
        url = urlparse(self.path)
        if url.path == "/":
            body = STATIC.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif url.path == "/api/batch":
            size = int(parse_qs(url.query).get("size", ["20"])[0])
            work, auth = workdb.connect(self.work_db), store.connect(self.authoring_db)
            try:
                self._json(200, batch.select_batch(work, auth, max(1, min(size, 100))))
            finally:
                work.close(); auth.close()
        elif url.path == "/api/stats":
            auth = store.connect(self.authoring_db)
            try:
                stats = dict(auth.execute("SELECT review_status, COUNT(*) FROM sentences GROUP BY review_status"))
                self._json(200, stats)
            finally:
                auth.close()
        else:
            self._json(404, {"error": "no encontrado"})

    def do_POST(self):
        if not self._local_only():
            return self._json(403, {"error": "origen no permitido"})
        if urlparse(self.path).path != "/api/decision":
            return self._json(404, {"error": "no encontrado"})
        if not self.headers.get("Content-Type", "").startswith("application/json"):
            return self._json(400, {"error": "se espera application/json"})
        try:
            payload = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"")
            sentence_id, decision = payload["id"], payload["decision"]
            if not isinstance(sentence_id, str) or not isinstance(decision, dict):
                raise ValueError("id (texto) y decision (objeto) son obligatorios")
        except (ValueError, KeyError, TypeError) as e:
            return self._json(400, {"error": f"solicitud inválida: {e}"})
        auth = store.connect(self.authoring_db)
        try:
            batch.record_decision(auth, sentence_id, decision)
        except ValueError as e:
            return self._json(400, {"error": str(e)})
        finally:
            auth.close()
        self._json(200, {"ok": True})


def make_server(work_db, authoring_db, host: str = "127.0.0.1", port: int = 8765) -> HTTPServer:
    if host not in ("127.0.0.1", "localhost"):
        raise ValueError("el servidor de revisión solo escucha en localhost")
    handler = type("Handler", (_Handler,), {"work_db": Path(work_db), "authoring_db": Path(authoring_db)})
    return HTTPServer(("127.0.0.1", port), handler)
