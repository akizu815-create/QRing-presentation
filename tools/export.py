"""Export the editable deck through Impress and validate the rendered pages."""
import argparse
from collections import Counter
import os
from pathlib import Path
import re
import subprocess
from tempfile import TemporaryDirectory
import unicodedata
import xml.etree.ElementTree as ET
from zipfile import ZipFile

import fitz
from PIL import Image

NS = {
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
}


def normalize(text):
    return re.sub(r"\s+", "", unicodedata.normalize("NFKC", text))


def pptx_pages(path):
    with ZipFile(path) as archive:
        presentation = ET.fromstring(archive.read("ppt/presentation.xml"))
        count = len(presentation.findall("p:sldIdLst/p:sldId", NS))
        size = presentation.find("p:sldSz", NS)
        assert int(size.get("cx")) * 9 == int(size.get("cy")) * 16, "PPTXが16:9ではありません"
        for index in range(1, count + 1):
            slide = ET.fromstring(archive.read(f"ppt/slides/slide{index}.xml"))
            tree = slide.find("p:cSld/p:spTree", NS)
            shapes = tree.findall("p:sp", NS)
            texts = [
                "".join(node.text or "" for node in shape.findall(".//a:t", NS))
                for shape in shapes if shape.find("p:txBody", NS) is not None
            ]
            yield texts, len(shapes) - len(texts), len(tree.findall("p:pic", NS))


def validate_page(page, expected):
    assert abs(page.rect.width / page.rect.height - 16 / 9) < 0.001, "PDFが16:9ではありません"
    actual = normalize(page.get_text())
    for text, count in Counter(map(normalize, expected)).items():
        assert actual.count(text) >= count, f"{page.number + 1}枚目の抽出テキストが不足: {text}"
    for word in page.get_text("words"):
        assert page.rect.contains(fitz.Rect(word[:4])), f"紙面外のテキスト: {word[4]}"


def export(deck_id):
    if not re.fullmatch("[a-z][a-z0-9-]*", deck_id):
        raise ValueError("資料IDが不正です")
    output = Path(__file__).resolve().parents[1] / "decks" / deck_id / "output"
    pptx = output / "deck.pptx"
    pages = list(pptx_pages(pptx))
    with TemporaryDirectory(prefix="qring-export-") as work:
        work = Path(work)
        subprocess.run(
            [os.environ.get("SOFFICE", "soffice"),
             f"-env:UserInstallation={(work / 'profile').as_uri()}", "--headless",
             "--convert-to", "pdf:impress_pdf_Export", "--outdir", str(work), str(pptx)],
            check=True, timeout=120,
        )
        pdf_path = work / "deck.pdf"
        with fitz.open(pdf_path) as pdf, fitz.open(output / "html-reference.pdf") as html:
            assert len(pdf) == len(html) == len(pages), "ページ数が一致しません"
            previews = output / "preview"
            previews.mkdir(exist_ok=True)
            tile_width, tile_height, gutter, columns = 520, 293, 16, 2
            rows = (len(pages) + columns - 1) // columns
            sheet = Image.new(
                "RGB",
                (columns * tile_width + (columns + 1) * gutter,
                 rows * tile_height + (rows + 1) * gutter),
                "#D9D0BE",
            )
            for index, (expected, shapes, pictures) in enumerate(pages):
                validate_page(pdf[index], expected)
                validate_page(html[index], expected)
                page = pdf[index]
                scale = fitz.Matrix(1440 / page.rect.width, 810 / page.rect.height)
                pixmap = page.get_pixmap(matrix=scale, alpha=False)
                image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
                image = image.crop((0, 0, 1440, 810))
                image.save(previews / f"slide-{index+1:02}.png", optimize=True)
                image.thumbnail((tile_width, tile_height), Image.Resampling.LANCZOS)
                row, column = divmod(index, columns)
                sheet.paste(image, (gutter + column * (tile_width + gutter),
                                    gutter + row * (tile_height + gutter)))
                print(f"{index+1:02}: テキスト {len(expected)} / 図形 {shapes} / 写真 {pictures}")
            sheet.save(output / "contact-sheet.png", optimize=True)
        (output / "deck.pdf").write_bytes(pdf_path.read_bytes())


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("deck", nargs="?", default="municipal")
    export(parser.parse_args().deck)
