import fitz  # pymupdf
import sys

pdf_path = r"c:\Users\srinivas\OneDrive\Desktop\final_project\teach-tribe-2 -clg\Group_Project_Report (1).pdf"
output_path = r"c:\Users\srinivas\OneDrive\Desktop\final_project\teach-tribe-2 -clg\server\pdf-content.txt"

doc = fitz.open(pdf_path)
lines = []
for i, page in enumerate(doc):
    lines.append(f"\n{'='*60}")
    lines.append(f"PAGE {i+1}")
    lines.append(f"{'='*60}")
    text = page.get_text()
    lines.append(text)

with open(output_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print(f"Extracted {len(doc)} pages to {output_path}")
doc.close()
