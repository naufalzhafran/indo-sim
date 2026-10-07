"""Extract BPS table 89 (2024 sector distribution), PDF pages 137–138.

Usage: python3 scripts/import-sectors.py /path/to/official-publication.pdf
Only statistical facts are bundled, not the publication. Requires pdftotext.
"""
import hashlib
import json
import re
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

root = Path(__file__).resolve().parents[1]
pdf = Path(sys.argv[1])
ns = {"x": "http://www.w3.org/1999/xhtml"}
with tempfile.TemporaryDirectory() as directory:
    xml = Path(directory) / "rows.xml"
    subprocess.run(["pdftotext", "-f", "137", "-l", "138", "-bbox", str(pdf), str(xml)], check=True, stderr=subprocess.DEVNULL)
    pages = ET.parse(xml).findall(".//x:page", ns)
    extracted = []
    for page_index, page in enumerate(pages):
        words = page.findall("x:word", ns)
        rows = {}
        for word in words:
            if not re.fullmatch(r"\d+\.", word.text or "") or not 65 < float(word.attrib["xMin"]) < 85:
                continue
            ordinal = int(word.text[:-1])
            if not 1 <= ordinal <= 38:
                continue
            y = float(word.attrib["yMin"])
            cells = sorted([w for w in words if abs(float(w.attrib["yMin"]) - y) < 0.2 and float(w.attrib["xMin"]) > 160], key=lambda w: float(w.attrib["xMin"]))
            numbers = [0.0 if w.text == "~0" else float(w.text.replace(",", ".")) for w in cells if re.fullmatch(r"\d+,\d+|~0", w.text or "")]
            expected = 10 if page_index == 0 else 8
            assert len(numbers) == expected, (ordinal, page_index, numbers)
            rows[ordinal] = numbers[:10 if page_index == 0 else 7]
        assert len(rows) == 38, (page_index, len(rows))
        extracted.append(rows)

path = root / "src/data/baseline.json"
baseline = json.loads(path.read_text())
records = []
for ordinal, province in enumerate(baseline["provinces"], 1):
    values = extracted[0][ordinal] + extracted[1][ordinal]
    assert abs(sum(values) - 100) <= 0.06, (province["name"], sum(values))
    grouped = [values[0], values[1], values[2], sum(values[3:13]) + values[16], sum(values[13:16])]
    shares = [v / sum(grouped) for v in grouped]
    province["sectors"] = shares
    records.append({"id": province["id"], "name": province["name"], "industryPercent": values, "sectors": shares})

source = "https://www.bps.go.id/id/publication/2025/04/11/95c729ee8c6fb5e2cb86b00f/gross-regional-domestic-product-of-provinces-in-indonesia-by-industry-2020-2024.html"
data = {
    "source": source, "table": "89", "printedPages": [113, 114], "pdfPages": [137, 138],
    "referenceYear": 2024, "publicationDate": "2025-04-11", "sha256": hashlib.sha256(pdf.read_bytes()).hexdigest(),
    "mapping": ["A", "B", "C", "D,E,F,G,H,I,J,K,L,M,N,R,S,T,U", "O,P,Q"],
    "limitations": "Current-price industry shares, normalized for publication rounding. Public services groups administration, education and health irrespective of provider ownership. Market services includes construction and utilities. Shares use April 2025 vintage; GDP totals retain the February yearbook vintage. No observed trade flows are implied.",
    "provinces": records,
}
(root / "src/data/sectors.json").write_text(json.dumps(data, indent=2) + "\n")
baseline["version"] = "2024.2"
baseline["provenance"]["sectors"] = source + " Table 89, 2024 observed industry percentages; aggregation and rounding documented in sectors.json."
baseline["provenance"]["inferred"] = baseline["provenance"]["inferred"].replace("five-sector profiles, ", "")
path.write_text(json.dumps(baseline, indent=2) + "\n")
print("Imported and reconciled 38 observed provincial sector profiles.")
