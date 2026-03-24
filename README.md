<div align="center">
  <img src="public/favicon.ico" alt="MedSage Logo" width="100"/>
  <h1>MedSage: The AI-Powered Medical Study Companion</h1>
  <p><strong>Your smartest ally to master medical mystery.</strong></p>
</div>

---

## 🔥 The Vision

**We lived the problem. Now we're fixing it.** 

One of our closest friends, a medical student, used to tell us how overwhelming it was to prepare for exams with limited guidance. She’d struggle with last-minute doubts and couldn’t find any AI-based tool tailored specifically to her needs. Her repeated frustration made us realize how underserved medical students are when it comes to intelligent academic support. 

That’s what inspired us to create **MedSage**—an AI-powered study companion built *just* for med students. We believe every medical student deserves a reliable digital mentor, and we’re committed to making that vision real.

---

## ⚡ What It Does

MedSage isn't just another chatbot; it's a domain-specific digital mentor. It answers your live medical questions in two distinct modes:
- **🎯 Exam Mode:** Crisp, high-yield points tailored for last-minute revision and direct answers.
- **🧠 Concept Mode:** Detailed, deep-dive explanations complete with analogies to truly grasp complex subjects.

It also generates personalized, auto-adjusting study plans based on your syllabus and exam dates, provides clickable textbook references verified from core medical literature, and is architected to work gracefully even in offline or low-bandwidth situations.

---

## 🏗️ How We Built It

We engineered MedSage with a robust and modern tech stack:
- **Frontend Stack:** React 18, Material-UI (MUI) v5, Framer Motion (for fluid animations), React Router v6, and Workbox for PWA features.
- **Backend Stack:** Node.js with Express.js powers our scalable and resilient API layer.
- **AI Engine:** Powered by **Google Gemini** with a grounded medical answer pipeline for retrieval, citations, and confidence scoring.
- **Database & Caching:** MongoDB for persistent user data plus an in-process query cache for fast repeat responses.
- **Offline Resiliency:** Progressive Web App (PWA) architecture ensures your learning never stops—even in a hospital basement without a signal.

---

## 🏆 Accomplishments We're Proud Of

- **Dynamic Study Planner:** Built an adaptive engine that creates and auto-adjusts personalized study schedules.
- **Resilient Infrastructure:** Delivered a lightweight, accessible, mobile-first experience that functions reliably offline.
- **Real Impact:** Created something genuinely helpful and meaningful to alleviate the pain points of stressed-out medical students.

---

## 🚧 Challenges We Ran Into

The journey wasn't easy. During development, reliable access to the right LLM and grounding stack meant we couldn't immediately test every medical workflow with real-world, real-time queries. Furthermore, creating a study planner capable of unifying diverse curricula (e.g., Indian MBBS, US MD) demanded rigorous and meticulous data structuring.

Optimizing for speed and offline availability under strict timelines tested our engineering limits, while designing a UI that flawlessly balances complex functionality with the simplicity a stressed-out student needs tested our empathy.

---

## 💡 What We Learned

We learned the intricate art of fine-tuning AI prompts for highly specific domain contexts. We realized how crucial caching and performance optimization are when users depend on your platform during crunch time. Above all, we learned that true product design requires empathy for real-world user pain points. We grew stronger as a team—working exceptionally fast, staying flexible, and learning constantly.

---

## 🚀 What's Next for MedSage

We are just getting started! Our immediate roadmap includes:
- 🎙️ **Voice-based Querying & Multilingual Support** to map learning across languages and modalities.
- 🌍 **Global Syllabus Expansion** to support medical curricula across more countries natively.
- 📚 **Publisher Integrations** to connect directly with medical publishers for 100% verified textbook data.
- 🔄 **Continuous Feedback Loops** to constantly improve and refine answer accuracy based on community ratings.

---

## 💻 Tech Specs & Getting Started

### Prerequisites
- Node.js (v16+)
- npm or yarn
- MongoDB (optional for full features)
- No external cache is required for local development

### Installation & Run

1. **Clone the repository**
   ```bash
   git clone https://github.com/medsage/medsage.git
   cd medsage
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   Add your config to `.env`:
   ```env
   REACT_APP_API_URL=http://localhost:4000
   REACT_APP_OFFLINE_MODE=true
   ```

4. **Available Scripts**
   ```bash
   # Start development server
   npm start
   
   # Build for production
   npm run build
   
   # Run tests
   npm test
   ```

---

## 🎨 UI & Structure Highlights

- **Home Page:** Hero section with gradient title, quick action cards with animated icons, progress tracking, and recent activity feed.
- **Study Planner:** Today's schedule overview, interactive plan generator, subject/weak area selection, and expandable daily topics.
- **Question Page:** Syllabus-aligned Q&A, textbook citations, offline support, and recent queries history.

### Directory Layout
```text
medsage/
├── public/                   # Static resources
├── src/
│   ├── components/           # UI Elements (home, planner, Q&A, common)
│   ├── contexts/             # React State Management
│   ├── hooks/                # Custom hooks/logic
│   ├── pages/                # High-level route views
│   ├── services/             # API connections
│   ├── utils/                # Helper utilities
│   ├── App.js                # Core app entry
│   └── index.js              # DOM renderer
└── server/                   # Backend logic, routing, and APIs
```

---

## 🤝 Contributing & License
We welcome contributions to MedSage! Please check our **CONTRIBUTING.md** for guidelines. This project is licensed under the **MIT License**.

## 🙏 Acknowledgements
- **Material-UI team** for the excellent component library
- **Framer Motion** for bringing our interfaces to life
- **The Medical Community**—all the medical students who provided vital feedback during development

<br/>
<div align="center">
  <strong>MedSage: We believe every medical student deserves a reliable digital mentor.</strong>
</div>
