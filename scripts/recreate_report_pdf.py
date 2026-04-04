from __future__ import annotations

import argparse
import re
from itertools import cycle
from pathlib import Path

import fitz  # PyMuPDF


REPLACEMENTS: list[tuple[str, str]] = [
    # Project/topic identity
    (r"\bTRAVEL MANAGEMENT SYSTEM\b", "TEACH TRIBE LMS"),
    (r"^TRAVEL$", "TEACH"),
    (r"^MANAGEMENT SYSTEM$", "TRIBE LMS"),
    (r"\btravel agency management system\b", "Teach Tribe LMS"),
    (r"\btravel management system\b", "Teach Tribe LMS"),

    # Tech stack modernization
    (r"\bINTRODUCTION TO PYTHON PROGRAMMING\b", "INTRODUCTION TO WEB TECHNOLOGIES"),
    (r"\bHISTORY OF PYTHON\b", "HISTORY OF MODERN WEB STACK"),
    (r"\bAPPLICATION OF PYTHON\b", "APPLICATIONS OF MODERN WEB STACK"),
    (r"\bINTRODUCTION TO DATABASE MANAGEMENT SYSTEM\b", "INTRODUCTION TO FIREBASE AND FIRESTORE"),
    (r"\bHISTORY OF DBMS\b", "HISTORY OF CLOUD DATABASES"),
    (r"\bAPPLICATIONS OF DBMS\b", "APPLICATIONS OF FIRESTORE"),
    (r"\bDATABASE MANAGEMENT SYSTEM\b", "FIREBASE FIRESTORE SYSTEM"),
    (r"\bFlask and MySQL\b", "React + Firebase"),
    (r"\bFlask development server\b", "Vite dev server"),
    (r"\bFlask Framework\b", "Express + React"),
    (r"\bFlask Templates\b", "React Components"),
    (r"\bFlask\b", "Node"),
    (r"\bMySQL Database\b", "Firestore Database"),
    (r"\bMySQL\b", "Firebase"),
    (r"\bPython Version\b", "Node Version"),
    (r"\bPython\b", "React"),
    (r"\bDBMS\b", "NoSQL"),
    (r"\bJinja2\b", "JSX"),
    (r"\bWerkzeug\b", "Express"),
    (r"\bmysql-connector-python\b", "Firebase SDK"),
    (r"\bmysql\.connector\b", "firebase.db"),
    (r"\brender_template\b", "render_view"),
    (r"\bDATABASE CONNECTION\b", "FIREBASE CONNECTION"),
    (r"\bsql_connection\b", "db_connection"),
    (r"\bcreate table\b", "create doc"),
    (r"\bvarchar\b", "string"),
    (r"\bprimary key\b", "doc id"),
    (r"\bforeign key\b", "ref id"),
    (r"\bon delete cascade\b", "on delete hook"),
    (r"\bSQL:", "Query:"),
    (r"using SQL", "using NoSQL"),
    (r"\brelational database\b", "cloud database"),

    # Domain terminology (old to current)
    (r"\b/agencysignup\b", "/signup"),
    (r"\b/customerlogin\b", "/login"),
    (r"\b/addpackages\b", "/courseadd"),
    (r"\bagencysignup\b", "signup"),
    (r"\bcustomerlogin\b", "login"),
    (r"\baddpackages\b", "courseadd"),
    (r"\bauthenticated_agency_id\b", "active_admin_id"),
    (r"\bauthenticated_customer_id\b", "active_user_id"),
    (r"\btravel agencies\b", "admin teams"),
    (r"\btravel agency\b", "learning platform"),
    (r"\btravel packages\b", "courses"),
    (r"\btravel package\b", "course"),
    (r"\btour packages\b", "courses"),
    (r"\btour package\b", "course"),
    (r"\bbookings\b", "enrolls"),
    (r"\bbooking\b", "enroll"),
    (r"\bcustomers\b", "students"),
    (r"\bcustomer\b", "student"),
    (r"\bagencies\b", "admins"),
    (r"\bagency\b", "admin"),
    (r"\bguides\b", "tutors"),
    (r"\bguide\b", "tutor"),
    (r"\bpackages\b", "courses"),
    (r"\bpackage\b", "course"),
    (r"\btourism\b", "online learning"),
    (r"\btour\b", "course"),
    (r"\btravel\b", "learning"),
    (r"\bteach courses\b", "courses"),
    (r"\bLEARNING TRIBE LMS\b", "TEACH TRIBE LMS"),
    (r"/courseaddd", "/courseadd"),
    (r"\btraveldb\b", "teachtribedb"),
    (r"\bWanderWise\b", "TeachTribe"),
    (r"https://www\.w3schools\.com/mysql/mysql_intro\.asp", "https://firebase.google.com/docs/firestore"),
    (r"https://www\.geeksforgeeks\.org/python-programming-language-tutorial/", "https://react.dev/learn"),
    (r"mysql_intro\.asp", "firestore_intro"),

    # Uppercase table headings and labels
    (r"\bAGENCY\b", "ADMIN"),
    (r"\bCUSTOMER\b", "STUDENT"),
    (r"\bGUIDE\b", "TUTOR"),
    (r"\bPACKAGE\b", "COURSE"),
    (r"\bBOOKING\b", "ENROLL"),
]


IMAGE_REPLACEMENT_PAGES = set(range(56, 61)) | set(range(62, 68))
IMAGE_AREA_THRESHOLD = 12000.0


def apply_case_style(replacement: str, source: str) -> str:
    if source.isupper():
        return replacement.upper()
    if source.islower():
        return replacement.lower()
    if source[:1].isupper() and source[1:].islower():
        return replacement.title()
    return replacement


def color_int_to_rgb(color: int | tuple[int, int, int] | None) -> tuple[float, float, float]:
    if color is None:
        return (0, 0, 0)
    if isinstance(color, tuple):
        r, g, b = color
        return (r / 255.0, g / 255.0, b / 255.0)
    r = (color >> 16) & 255
    g = (color >> 8) & 255
    b = color & 255
    return (r / 255.0, g / 255.0, b / 255.0)


def replace_text(text: str) -> str:
    updated = text
    for pattern, replacement in REPLACEMENTS:
        updated = re.sub(
            pattern,
            lambda m: apply_case_style(replacement, m.group(0)),
            updated,
            flags=re.IGNORECASE,
        )
    return updated


def insert_span_text(
    page: fitz.Page,
    rect: fitz.Rect,
    text: str,
    font_size: float,
    font_name: str,
    color: tuple[float, float, float],
) -> bool:
    try:
        inserted = page.insert_textbox(
            rect,
            text,
            fontsize=font_size,
            fontname=font_name,
            color=color,
            align=0,
        )
        if inserted >= 0:
            return True
    except Exception:
        pass

    try:
        inserted = page.insert_textbox(
            rect,
            text,
            fontsize=font_size,
            fontname="helv",
            color=color,
            align=0,
        )
        if inserted >= 0:
            return True
    except Exception:
        pass

    # Final fallback: draw text from baseline point to avoid losing content in tight boxes.
    try:
        page.insert_text(
            fitz.Point(rect.x0, rect.y1 - 1.0),
            text,
            fontsize=font_size,
            fontname="helv",
            color=color,
        )
        return True
    except Exception:
        return False


def process_pdf(source: Path, output: Path) -> tuple[int, int]:
    doc = fitz.open(source)
    page_count = len(doc)
    spans_changed = 0

    for page in doc:
        text_dict = page.get_text("dict")
        edits: list[tuple[fitz.Rect, str, str, float, str, tuple[float, float, float]]] = []

        for block in text_dict.get("blocks", []):
            if block.get("type") != 0:
                continue
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    original = span.get("text", "")
                    if not original.strip():
                        continue

                    updated = replace_text(original)
                    if updated == original:
                        continue

                    rect = fitz.Rect(span["bbox"])
                    font_size = float(span.get("size", 11))
                    font_name = str(span.get("font", "helv"))
                    color = color_int_to_rgb(span.get("color", 0))
                    edits.append((rect, original, updated, font_size, font_name, color))

        if not edits:
            continue

        for rect, _, _, _, _, _ in edits:
            page.add_redact_annot(rect, fill=(1, 1, 1))
        page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)

        for rect, original, updated, font_size, font_name, color in edits:
            # Keep exact font size. If replacement cannot fit, restore original text.
            if not insert_span_text(page, rect, updated, font_size, font_name, color):
                insert_span_text(page, rect, original, font_size, font_name, color)
            spans_changed += 1

    replace_embedded_images(doc)

    doc.save(output)
    doc.close()
    return page_count, spans_changed


def replace_embedded_images(doc: fitz.Document) -> None:
    screenshot_dir = Path("screenshots") / "desktop-all"
    candidates = [
        "home.png",
        "login.png",
        "signup.png",
        "courses.png",
        "course-c1.png",
        "learn-c1.png",
        "create-course.png",
        "dashboard-student.png",
        "dashboard-instructor.png",
        "dashboard-admin.png",
        "dashboard-master-admin.png",
        "profile.png",
        "workspace-select.png",
    ]
    images = [screenshot_dir / name for name in candidates if (screenshot_dir / name).exists()]
    if not images:
        return

    img_cycle = cycle(images)

    for page_no, page in enumerate(doc, start=1):
        if page_no not in IMAGE_REPLACEMENT_PAGES:
            continue

        blocks = page.get_text("dict").get("blocks", [])
        targets: list[fitz.Rect] = []
        for block in blocks:
            if block.get("type") != 1:
                continue
            x0, y0, x1, y1 = block["bbox"]
            area = (x1 - x0) * (y1 - y0)
            if area >= IMAGE_AREA_THRESHOLD:
                targets.append(fitz.Rect(block["bbox"]))

        # Replace top-to-bottom to preserve document reading flow.
        targets.sort(key=lambda r: (r.y0, r.x0))

        for rect in targets:
            page.draw_rect(rect, color=(1, 1, 1), fill=(1, 1, 1), overlay=True)
            page.insert_image(rect, filename=str(next(img_cycle)), keep_proportion=False, overlay=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Recreate the report PDF for Teach Tribe while preserving the original format and font size."
    )
    parser.add_argument(
        "--source",
        type=Path,
        default=Path("Group_Project_Report (1).pdf"),
        help="Source template PDF path",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("Group_Project_Report_TeachTribe.pdf"),
        help="Output PDF path",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.source.exists():
        raise FileNotFoundError(f"Source PDF not found: {args.source}")

    pages, changed = process_pdf(args.source, args.output)
    print(f"Processed pages: {pages}")
    print(f"Text spans updated: {changed}")
    print(f"Output written to: {args.output}")


if __name__ == "__main__":
    main()
