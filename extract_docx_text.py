import json
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NS = {"w": W_NS}


def _text_in(el: ET.Element) -> str:
    parts: list[str] = []
    for t in el.findall(".//w:t", NS):
        if t.text:
            parts.append(t.text)
    return re.sub(r"\s+$", "", "".join(parts).replace("\u00a0", " ")).strip()


def docx_to_blocks(docx_path: Path) -> list[dict]:
    with zipfile.ZipFile(docx_path) as z:
        xml_bytes = z.read("word/document.xml")

    root = ET.fromstring(xml_bytes)
    body = root.find("w:body", NS)
    if body is None:
        return []

    blocks: list[dict] = []
    for child in list(body):
        tag = child.tag.rsplit("}", 1)[-1]
        if tag == "p":
            text = _text_in(child)
            if text:
                blocks.append({"type": "p", "text": text})
        elif tag == "tbl":
            rows: list[list[str]] = []
            for tr in child.findall("w:tr", NS):
                row: list[str] = []
                for tc in tr.findall("w:tc", NS):
                    cell_texts: list[str] = []
                    for p in tc.findall("w:p", NS):
                        t = _text_in(p)
                        if t:
                            cell_texts.append(t)
                    row.append("\n".join(cell_texts).strip())
                if any(c.strip() for c in row):
                    rows.append(row)
            if rows:
                blocks.append({"type": "table", "rows": rows})

    return blocks


def main() -> None:
    docx_path = Path(__file__).with_name("Assessment_Ali_Diab.docx")
    blocks = docx_to_blocks(docx_path)
    print(json.dumps({"source": str(docx_path.name), "blocks": blocks}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
