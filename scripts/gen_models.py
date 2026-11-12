"""Genera modelos Pydantic desde schemas/*.schema.json → pipeline/models/. No editar la salida a mano.
Copia los esquemas sin `$id` para que los $ref relativos se resuelvan como archivos locales."""
import json, shutil, subprocess, sys, tempfile
from pathlib import Path

root = Path(__file__).resolve().parent.parent
out = root / "pipeline" / "models"
with tempfile.TemporaryDirectory() as tmp:
    for f in (root / "schemas").glob("*.schema.json"):
        d = json.loads(f.read_text())
        d.pop("$id", None)
        (Path(tmp) / f.name).write_text(json.dumps(d))
    shutil.rmtree(out, ignore_errors=True)
    r = subprocess.run([
        str(root / ".venv" / "bin" / "datamodel-codegen"),
        "--input", tmp, "--input-file-type", "jsonschema", "--output", str(out),
        "--output-model-type", "pydantic_v2.BaseModel", "--use-annotated", "--disable-timestamp",
        "--use-standard-collections", "--target-python-version", "3.12",
    ], capture_output=True, text=True)
    print(r.stdout[-800:], r.stderr[-1500:])
    sys.exit(r.returncode)
