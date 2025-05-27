# MedSage: AI-Powered Medical Study Companion

MedSage is an intelligent study companion designed specifically for medical students. It provides syllabus-aligned answers with textbook citations, personalized study plans, and offline support to make medical learning more efficient and accessible.

## 🧠 Features

- **Expert Q&A:** Get concise, exam-focused or in-depth conceptual answers with proper textbook citations
- **Syllabus Alignment:** Responses tailored to your curriculum (Indian MBBS, US MD, etc.)
- **Personalized Study Planner:** Generate adaptive study schedules based on your progress and exam date
- **Offline & Low-Bandwidth Support:** Access core features even with limited connectivity
- **Progress Tracking:** Monitor your learning journey and revisit weak areas
- **Smart Dashboard:** View today's schedule, recent activity, and quick access to key features
- **Responsive Design:** Optimized for all device sizes with a modern, intuitive interface

## 🚀 Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- MongoDB (optional for full features)
- Redis (optional for caching)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/medsage.git
cd medsage
```

2. Install dependencies
```bash
npm install
```

3. Create environment file
```bash
cp .env.example .env
```

4. Add your configuration to the `.env` file
```
REACT_APP_API_URL=http://localhost:4000
REACT_APP_OFFLINE_MODE=true
```

5. Start the development server
```bash
npm start
```

## 🏗️ Tech Stack

### Frontend
- React 18
- Material-UI (MUI) v5
- Framer Motion for animations
- React Router v6
- Context API for state management
- Workbox for offline support
- Axios for API requests

## 📁 Project Structure

```
medsage/
├── src/
│   ├── components/           # React components
│   │   ├── common/          # Shared components
│   │   ├── home/           # Home page components
│   │   ├── study-planner/  # Study planner components
│   │   ├── questions/      # Question components
│   │   └── book-reference/ # Book reference components
│   ├── contexts/           # React contexts
│   ├── hooks/             # Custom React hooks
│   ├── pages/             # Page components
│   ├── services/          # API integration services
│   ├── utils/             # Helper utilities
│   ├── App.js             # Main application component
│   └── index.js           # Entry point
├── public/                # Static assets
├── package.json           # Project dependencies
└── README.md             # Project documentation
```

## 🎨 UI Components

### Home Page
- Hero section with gradient title
- Quick action cards with animated icons
- Progress tracking with circular indicator
- Recent activity feed
- Recommended content section

### Study Planner
- Today's schedule overview
- Interactive study plan generator
- Subject and weak area selection
- Expandable daily topics
- Progress tracking

### Question Page
- Syllabus-aligned Q&A
- Textbook citations
- Offline support
- Recent queries history

## 📱 Responsive Design

The application is fully responsive and optimized for:
- Desktop (1920px, 1440px, 1024px)
- Tablet (768px)
- Mobile (480px, 320px)

## 🔧 Development

### Available Scripts

```bash
# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Eject from create-react-app
npm run eject
```

### Code Style

- ESLint for code linting
- Prettier for code formatting
- Component-based architecture
- Custom hooks for reusable logic

## 📋 Contributing

We welcome contributions to MedSage! Please check our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- Material-UI team for the excellent component library
- Framer Motion for the animation capabilities
- All medical students who provided feedback during development

---

**MedSage: Your wise guide for the medical journey.**
