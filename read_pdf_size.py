import PyPDF2

try:
    with open('Syllabus - MBBS.pdf', 'rb') as f:
        reader = PyPDF2.PdfReader(f)
        text = ''
        for page in reader.pages:
            text += page.extract_text() + '\n'
        print('Total pages:', len(reader.pages))
        print('Total characters:', len(text))
except Exception as e:
    print('Error:', e)
