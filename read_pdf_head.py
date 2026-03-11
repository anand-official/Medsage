import PyPDF2
import sys

def search_text(file_path):
    with open(file_path, 'rb') as f:
        reader = PyPDF2.PdfReader(f)
        text = ''
        for p in reader.pages:
            t = p.extract_text()
            if t: text += t + '\n'
    return text

if __name__ == '__main__':
    text = search_text('Syllabus - MBBS.pdf')
    lines = text.split('\n')
    for i, line in enumerate(lines[:100]):
        if line.strip(): print(f"{i}: {line}")
