import PyPDF2
import re
import json
import os

def extract_colleges(pdf_path, output_json):
    colleges = []
    
    try:
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            full_text = ""
            for i in range(len(reader.pages)):
                text = reader.pages[i].extract_text()
                if text:
                    full_text += text + "\n"
            
            # Use regex to find "Number. College Name"
            # Since names can wrap to the next line before "Location:" or "Curriculum:" or another number
            
            # Simple approach: look for lines starting with "1. ", "2. ", etc.
            lines = full_text.split('\n')
            current_college = ""
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                # Check if line starts with a number and a dot
                match = re.match(r'^(\d+)\.\s+(.*)', line)
                if match:
                    if current_college:
                        colleges.append(current_college.strip())
                    current_college = match.group(2)
                elif current_college:
                    # Append to current college if it's not a Location or Curriculum line
                    if line.startswith('Location:') or line.startswith('Curriculum:') or line.startswith('Phase'):
                        colleges.append(current_college.strip())
                        current_college = ""
                    else:
                        current_college += " " + line
            
            if current_college:
                colleges.append(current_college.strip())
                
            # Clean up college names (remove any trailing numbers or weird artifacts)
            cleaned_colleges = []
            for c in colleges:
                name = c.strip()
                if name and name not in cleaned_colleges:
                    cleaned_colleges.append(name)
            
            with open(output_json, 'w', encoding='utf-8') as f:
                json.dump({"colleges": cleaned_colleges}, f, indent=2)
                
            print(f"Extracted {len(cleaned_colleges)} colleges.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    extract_colleges(
        "Top 100 MBBS Colleges India-merged.pdf", 
        "src/data/colleges.json"
    )
