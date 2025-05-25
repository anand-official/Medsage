# MedSage: AI-Powered Medical Study Companion

MedSage is an intelligent study companion designed specifically for medical students. It provides syllabus-aligned answers with textbook citations, personalized study plans, and offline support to make medical learning more efficient and accessible.

## 🧠 Features

- **Expert Q&A:** Get concise, exam-focused or in-depth conceptual answers with proper textbook citations
- **Syllabus Alignment:** Responses tailored to your curriculum (Indian MBBS, US MD, etc.)
- **Personalized Study Planner:** Generate adaptive study schedules based on your progress and exam date
- **Offline & Low-Bandwidth Support:** Access core features even with limited connectivity
- **Progress Tracking:** Monitor your learning journey and revisit weak areas

## 🚀 Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB
- Redis
- Perplexity Sonar API key

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/medsage.git
cd medsage
```

2. Install dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../src/frontend
npm install
```

3. Create environment files
```bash
# In the backend directory
cp .env.example .env
```

4. Add your API keys and configuration to the `.env` file
```
PORT=4000
MONGODB_URI=mongodb://localhost:27017/medsage
REDIS_URL=redis://localhost:6379
SONAR_API_KEY=your_sonar_api_key
SESSION_SECRET=your_session_secret
```

5. Start the development servers
```bash
# Start backend (from backend directory)
npm run dev

# Start frontend (from frontend directory)
npm start
```

## 🏗️ Tech Stack

### Backend
- Node.js + TypeScript
- Express.js
- MongoDB with Mongoose
- Redis for caching
- Perplexity Sonar API

### Frontend
- React + TypeScript
- Material-UI (MUI)
- Workbox for offline support
- Axios for API requests

## 📁 Project Structure

```
medsage/
├── backend/
│   ├── src/
│   │   ├── server.ts         # Main server entry point
│   │   ├── routes/           # API route definitions
│   │   ├── services/         # Business logic services
│   │   ├── models/           # Database models
│   │   └── utils/            # Helper utilities
│   ├── tsconfig.json         # TypeScript configuration
│   └── package.json          # Backend dependencies
├── src/
│   ├── frontend/             # React frontend application
│   │   ├── src/
│   │   │   ├── components/   # React components
│   │   │   ├── services/     # API integration services
│   │   │   ├── contexts/     # React contexts
│   │   │   ├── App.tsx       # Main application component
│   │   │   └── index.tsx     # Entry point
│   │   └── public/           # Static assets
│   └── package.json          # Frontend dependencies
└── README.md                 # Project documentation
```

## 🧪 API Reference

### Medical Query

```
POST /api/medical-query
```

Request body:
```json
{
  "question": "What are the major complications of diabetes mellitus?",
  "mode": "exam",  // "exam" or "conceptual"
  "syllabus": "Indian MBBS"  // Or other supported curricula
}
```

Response:
```json
{
  "textWithRefs": "The major complications of diabetes mellitus include...<ref id='0'>[Harrison's, p.2399]</ref>",
  "bookReferences": [
    { "book": "Harrison's", "year": 2018, "page": 2399 }
  ]
}
```

### Study Plan

```
POST /api/study-plan
```

Request body:
```json
{
  "syllabus": "Indian MBBS",
  "examDate": "2023-12-15",
  "currentProgress": ["Cardiovascular System", "Respiratory System"]
}
```

Response:
```json
{
  "daysRemaining": 45,
  "dailyTopics": [
    ["Endocrine System", "Renal System"],
    ["Gastrointestinal System"],
    // ...additional days
  ],
  "completionEstimate": "25%"
}
```

## 📋 Contributing

We welcome contributions to MedSage! Please check our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- Perplexity for providing the Sonar API
- Medical textbook publishers for the valuable knowledge base
- All medical students who provided feedback during development

---

**MedSage: Your wise guide for the medical journey.**
