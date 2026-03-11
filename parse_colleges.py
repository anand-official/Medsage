import PyPDF2
import sys

def extract_pdf(pdf_path):
    try:
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            for i in range(min(5, len(reader.pages))): # extract first 5 pages
                text += reader.pages[i].extract_text() + "\n"
            with open('extracted_colleges.txt', 'w', encoding='utf-8') as out:
                out.write(text)
            print("Successfully extracted.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    extract_pdf("Top 100 MBBS Colleges India-merged.pdf")
