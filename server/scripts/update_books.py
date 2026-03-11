import json
import re

new_books_code = """// Master book list for MBBS and BDS (curated selections)
const masterBookList = [
    // MBBS Year 1
    { title: "Human Anatomy (Vol 1–3)", author: "B.D. Chaurasia", course: 'MBBS', year: 1, category: 'Anatomy' },
    { title: "Gray's Anatomy for Students", author: "Richard L. Drake, Wayne Vogl, A.W.M. Mitchell", course: 'MBBS', year: 1, category: 'Anatomy' },
    { title: "Human Embryology", author: "Inderbir Singh", course: 'MBBS', year: 1, category: 'Anatomy' },
    { title: "Textbook of Histology", author: "Inderbir Singh", course: 'MBBS', year: 1, category: 'Anatomy' },
    { title: "Guyton & Hall Textbook of Medical Physiology", author: "Arthur C. Guyton, John E. Hall", course: 'MBBS', year: 1, category: 'Physiology' },
    { title: "Textbook of Physiology", author: "A.K. Jain", course: 'MBBS', year: 1, category: 'Physiology' },
    { title: "Review of Physiology", author: "G.K. Pal", course: 'MBBS', year: 1, category: 'Physiology' },
    { title: "Harper's Illustrated Biochemistry", author: "Murray, Bender", course: 'MBBS', year: 1, category: 'Biochemistry' },
    { title: "Textbook of Biochemistry", author: "D.M. Vasudevan", course: 'MBBS', year: 1, category: 'Biochemistry' },
    { title: "Biochemistry", author: "U. Satyanarayana", course: 'MBBS', year: 1, category: 'Biochemistry' },

    // MBBS Year 2
    { title: "Robbins & Cotran Pathologic Basis of Disease", author: "Kumar, Abbas, Aster", course: 'MBBS', year: 2, category: 'Pathology' },
    { title: "Textbook of Pathology", author: "Harsh Mohan", course: 'MBBS', year: 2, category: 'Pathology' },
    { title: "Practical Pathology", author: "Harsh Mohan", course: 'MBBS', year: 2, category: 'Pathology' },
    { title: "Essentials of Medical Pharmacology", author: "K.D. Tripathi", course: 'MBBS', year: 2, category: 'Pharmacology' },
    { title: "Basic & Clinical Pharmacology", author: "Katzung", course: 'MBBS', year: 2, category: 'Pharmacology' },
    { title: "Ananthanarayan & Paniker's Medical Microbiology", author: "Arti Kapil", course: 'MBBS', year: 2, category: 'Microbiology' },
    { title: "Textbook of Microbiology", author: "C.P. Baveja", course: 'MBBS', year: 2, category: 'Microbiology' },
    { title: "Textbook of Forensic Medicine & Toxicology", author: "K.S. Narayan Reddy", course: 'MBBS', year: 2, category: 'Forensic Medicine' },
    { title: "Review of Forensic Medicine", author: "Gautam Biswas", course: 'MBBS', year: 2, category: 'Forensic Medicine' },

    // MBBS Year 3 (Part I)
    { title: "Park's Textbook of Preventive & Social Medicine", author: "K. Park", course: 'MBBS', year: 3, category: 'Community Medicine' },
    { title: "Community Medicine", author: "Vivek Jain", course: 'MBBS', year: 3, category: 'Community Medicine' },
    { title: "Dhingra's Diseases of Ear, Nose & Throat", author: "P.L. Dhingra", course: 'MBBS', year: 3, category: 'ENT' },
    { title: "Textbook of ENT", author: "K.K. Hazarika", course: 'MBBS', year: 3, category: 'ENT' },
    { title: "Parsons' Diseases of the Eye", author: "Ramanjit Sihota", course: 'MBBS', year: 3, category: 'Ophthalmology' },
    { title: "Comprehensive Ophthalmology", author: "A.K. Khurana", course: 'MBBS', year: 3, category: 'Ophthalmology' },

    // MBBS Final Year (Part II)
    { title: "Harrison's Principles of Internal Medicine", author: "J. Larry Jameson et al.", course: 'MBBS', year: 4, category: 'Medicine' },
    { title: "API Textbook of Medicine", author: "Association of Physicians of India", course: 'MBBS', year: 4, category: 'Medicine' },
    { title: "Bailey & Love's Short Practice of Surgery", author: "Norman S. Williams", course: 'MBBS', year: 4, category: 'Surgery' },
    { title: "Manipal Manual of Surgery", author: "K. Rajgopal Shenoy", course: 'MBBS', year: 4, category: 'Surgery' },
    { title: "Williams Obstetrics", author: "Cunningham et al.", course: 'MBBS', year: 4, category: 'Obstetrics' },
    { title: "Shaw's Textbook of Gynecology", author: "V.G. Padubidri, Shirish N. Daftary", course: 'MBBS', year: 4, category: 'Gynecology' },
    { title: "Nelson Textbook of Pediatrics", author: "Robert M. Kliegman et al.", course: 'MBBS', year: 4, category: 'Pediatrics' },
    { title: "Apley & Solomon's System of Orthopaedics", author: "Louis Solomon", course: 'MBBS', year: 4, category: 'Orthopedics' },
    { title: "IADVL Textbook of Dermatology", author: "Sacchidanand et al.", course: 'MBBS', year: 4, category: 'Dermatology' },
    { title: "Kaplan & Sadock's Synopsis of Psychiatry", author: "Benjamin J. Sadock et al.", course: 'MBBS', year: 4, category: 'Psychiatry' },
    { title: "Essentials of Anaesthesiology", author: "K.K. Tripathi", course: 'MBBS', year: 4, category: 'Anesthesiology' },
    { title: "Textbook of Radiology", author: "Sumer Sethi", course: 'MBBS', year: 4, category: 'Radiology' },

    // BDS Year 1
    { title: "Human Anatomy (Vol 1–3)", author: "B.D. Chaurasia", course: 'BDS', year: 1, category: 'General Anatomy' },
    { title: "Textbook of Clinical Anatomy", author: "Vishram Singh", course: 'BDS', year: 1, category: 'General Anatomy' },
    { title: "Textbook of Physiology", author: "A.K. Jain", course: 'BDS', year: 1, category: 'Physiology' },
    { title: "Guyton & Hall Textbook of Medical Physiology", author: "Arthur Guyton, John Hall", course: 'BDS', year: 1, category: 'Physiology' },
    { title: "Textbook of Biochemistry for Dental Students", author: "D.M. Vasudevan", course: 'BDS', year: 1, category: 'Biochemistry' },
    { title: "Harper's Illustrated Biochemistry", author: "Murray, Bender", course: 'BDS', year: 1, category: 'Biochemistry' },
    { title: "Wheeler's Dental Anatomy, Physiology & Occlusion", author: "Stanley J. Nelson", course: 'BDS', year: 1, category: 'Dental Anatomy' },
    { title: "Orban's Oral Histology & Embryology", author: "S. Bhaskar", course: 'BDS', year: 1, category: 'Dental Anatomy' },
    { title: "Ten Cate's Oral Histology", author: "Antonio Nanci", course: 'BDS', year: 1, category: 'Dental Anatomy' },

    // BDS Year 2
    { title: "Robbins & Cotran Pathologic Basis of Disease", author: "Kumar, Abbas, Aster", course: 'BDS', year: 2, category: 'General Pathology' },
    { title: "Textbook of Pathology", author: "Harsh Mohan", course: 'BDS', year: 2, category: 'General Pathology' },
    { title: "Textbook of Microbiology for Dental Students", author: "C.P. Baveja", course: 'BDS', year: 2, category: 'Microbiology' },
    { title: "Ananthanarayan & Paniker's Microbiology", author: "Arti Kapil", course: 'BDS', year: 2, category: 'Microbiology' },
    { title: "Essentials of Medical Pharmacology", author: "K.D. Tripathi", course: 'BDS', year: 2, category: 'Pharmacology' },
    { title: "Pharmacology for Dentistry", author: "Shanbhag", course: 'BDS', year: 2, category: 'Pharmacology' },
    { title: "Phillips' Science of Dental Materials", author: "Kenneth J. Anusavice", course: 'BDS', year: 2, category: 'Dental Materials' },
    { title: "Basic Dental Materials", author: "J.J. Manappallil", course: 'BDS', year: 2, category: 'Dental Materials' },

    // BDS Year 3
    { title: "Textbook of Medicine for Dental Students", author: "S.N. Chugh", course: 'BDS', year: 3, category: 'General Medicine' },
    { title: "API Textbook of Medicine", author: "Association of Physicians of India", course: 'BDS', year: 3, category: 'General Medicine' },
    { title: "Textbook of Surgery for Dental Students", author: "Sanjay Marwah", course: 'BDS', year: 3, category: 'General Surgery' },
    { title: "Manipal Manual of Surgery", author: "K. Rajgopal Shenoy", course: 'BDS', year: 3, category: 'General Surgery' },
    { title: "Shafer's Textbook of Oral Pathology", author: "Rajendran, Sivapathasundharam", course: 'BDS', year: 3, category: 'Oral Pathology' },
    { title: "Oral & Maxillofacial Pathology", author: "Neville, Damm, Allen", course: 'BDS', year: 3, category: 'Oral Pathology' },

    // BDS Year 4
    { title: "Textbook of Oral Medicine & Radiology", author: "Anil Ghom", course: 'BDS', year: 4, category: 'Oral Medicine/Radiology' },
    { title: "Textbook of Oral Medicine & Radiology", author: "Ravikiran Ongole", course: 'BDS', year: 4, category: 'Oral Medicine/Radiology' },
    { title: "Textbook of Oral & Maxillofacial Surgery", author: "Neelima Anil Malik", course: 'BDS', year: 4, category: 'Oral Surgery' },
    { title: "Textbook of Oral & Maxillofacial Surgery", author: "S.M. Balaji", course: 'BDS', year: 4, category: 'Oral Surgery' },
    { title: "Peterson's Principles of Oral & Maxillofacial Surgery", author: "Peterson", course: 'BDS', year: 4, category: 'Oral Surgery' },
    { title: "Textbook of Prosthodontics", author: "V. Rangarajan", course: 'BDS', year: 4, category: 'Prosthodontics' },
    { title: "Contemporary Fixed Prosthodontics", author: "Rosenstiel, Land", course: 'BDS', year: 4, category: 'Prosthodontics' },
    { title: "Sturdevant's Art & Science of Operative Dentistry", author: "Sturdevant", course: 'BDS', year: 4, category: 'Conservative Dentistry' },
    { title: "Grossman's Endodontic Practice", author: "Louis I. Grossman", course: 'BDS', year: 4, category: 'Conservative Dentistry' },
    { title: "Textbook of Orthodontics", author: "V.S. Muthu", course: 'BDS', year: 4, category: 'Orthodontics' },
    { title: "Contemporary Orthodontics", author: "William R. Proffit", course: 'BDS', year: 4, category: 'Orthodontics' },
    { title: "Carranza's Clinical Periodontology", author: "Newman, Takei, Klokkevold", course: 'BDS', year: 4, category: 'Periodontology' },
    { title: "Textbook of Periodontology", author: "Shobha Tandon", course: 'BDS', year: 4, category: 'Periodontology' },
    { title: "Textbook of Pedodontics", author: "S.G. Damle", course: 'BDS', year: 4, category: 'Pedodontics' },
    { title: "McDonald & Avery's Dentistry for the Child & Adolescent", author: "Dean, Avery", course: 'BDS', year: 4, category: 'Pedodontics' },
    { title: "Textbook of Public Health Dentistry", author: "Soben Peter", course: 'BDS', year: 4, category: 'Public Health Dentistry' },
    { title: "Preventive & Community Dentistry", author: "Soben Peter", course: 'BDS', year: 4, category: 'Public Health Dentistry' }
];"""

with open('scripts/academyCrawler.js', 'r', encoding='utf-8') as f:
    code = f.read()

code = re.sub(r'// Master book list for MBBS and BDS \(curated selections\).*?\];', new_books_code, code, flags=re.DOTALL)

with open('scripts/academyCrawler.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("success!")
