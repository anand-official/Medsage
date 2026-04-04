import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Card,
  TextField,
  InputAdornment,
  Chip,
  Button,
  IconButton,
  Stack,
  CircularProgress,
  Tooltip,
  Snackbar,
  Alert,
  Skeleton,
  Menu,
  MenuItem,
  useTheme,
} from "@mui/material";
import {
  Search as SearchIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  MenuBook as BookIcon,
  AutoStories as ReadIcon,
  LocalHospital as MedicalIcon,
  MedicalServices as DentalIcon,
  Star as StarIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  OpenInNew as OpenInNewIcon,
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import "../animations.css";

// Year labels (no year 5 — no books there)
const YEAR_LABELS = {
  0: "All",
  1: "Year 1",
  2: "Year 2",
  3: "Year 3",
  4: "Year 4",
};

// Course mapping
const COURSE_LABELS = {
  ALL: "All Courses",
  MBBS: "Medicine (MBBS)",
  BDS: "Dentistry (BDS)",
};

const INSPIRATIONAL_QUOTES = [
  "The quiet mind absorbs the deepest truths.",
  "The art of medicine consists of amusing the patient while nature cures the disease.",
  "Wherever the art of medicine is loved, there is also a love of humanity.",
  "He who studies medicine without books sails an uncharted sea.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts.",
];

// Category → gradient palette for cover placeholders
const CATEGORY_GRADIENTS = {
  Anatomy: ["#6366f1", "#8b5cf6"],
  Physiology: ["#06b6d4", "#3b82f6"],
  Biochemistry: ["#10b981", "#059669"],
  Pathology: ["#ef4444", "#dc2626"],
  Pharmacology: ["#f59e0b", "#d97706"],
  Microbiology: ["#84cc16", "#65a30d"],
  "Forensic Medicine": ["#64748b", "#475569"],
  "Community Medicine": ["#22c55e", "#16a34a"],
  ENT: ["#a78bfa", "#7c3aed"],
  Ophthalmology: ["#38bdf8", "#0284c7"],
  Medicine: ["#f97316", "#ea580c"],
  Surgery: ["#e11d48", "#be123c"],
  Obstetrics: ["#ec4899", "#db2777"],
  Gynecology: ["#f472b6", "#e879f9"],
  Pediatrics: ["#34d399", "#10b981"],
  Orthopedics: ["#94a3b8", "#64748b"],
  Dermatology: ["#fb923c", "#f59e0b"],
  Psychiatry: ["#c084fc", "#a855f7"],
  Anesthesiology: ["#2dd4bf", "#14b8a6"],
  Radiology: ["#60a5fa", "#3b82f6"],
  "General Anatomy": ["#6366f1", "#8b5cf6"],
  "Dental Anatomy": ["#818cf8", "#6366f1"],
  "General Pathology": ["#ef4444", "#dc2626"],
  "General Medicine": ["#f97316", "#ea580c"],
  "General Surgery": ["#e11d48", "#be123c"],
  "Oral Pathology": ["#f43f5e", "#e11d48"],
  "Oral Medicine/Radiology": ["#38bdf8", "#0284c7"],
  "Oral Surgery": ["#dc2626", "#b91c1c"],
  Prosthodontics: ["#8b5cf6", "#7c3aed"],
  "Conservative Dentistry": ["#0ea5e9", "#0284c7"],
  Orthodontics: ["#f472b6", "#ec4899"],
  Periodontology: ["#4ade80", "#22c55e"],
  Pedodontics: ["#fbbf24", "#f59e0b"],
  "Public Health Dentistry": ["#a3e635", "#84cc16"],
  "Dental Materials": ["#67e8f9", "#22d3ee"],
};

function getCoverGradient(category) {
  const pair = CATEGORY_GRADIENTS[category] || ["#6366f1", "#c084fc"];
  return `linear-gradient(145deg, ${pair[0]}, ${pair[1]})`;
}

// Resolve best cover image URL for a book
function getCoverSrc(book) {
  if (book.coverUrl) return book.coverUrl;
  if (book.isbn) {
    const clean = book.isbn.replace(/[^0-9X]/gi, '');
    if (clean.length >= 10) return `https://covers.openlibrary.org/b/isbn/${clean}-L.jpg`;
  }
  return null;
}

// Best primary link for a book — prefer IA/OL direct links, fall back to Z-Lib search
function getPrimaryLink(book) {
  if (book.pdfLink && !book.pdfLink.includes('google.com/search')) return book.pdfLink;
  if (book.isbn) {
    const clean = book.isbn.replace(/[^0-9X]/gi, '');
    return `https://openlibrary.org/isbn/${clean}`;
  }
  // Z-Library search is the most reliably available free source
  const q = encodeURIComponent(`${book.title} ${(book.author || '').split(/[,;]/)[0].trim()}`);
  return `https://z-library.sk/s/${q.replace(/%20/g, '+')}`;
}

// Build fresh reliable free links (overrides stored URLs with current working domains)
function getReliableFreeLinks(book) {
  const title = book.title.replace(/['"]/g, '');
  const authorSurname = (book.author || '').split(/[,;]/)[0].trim().split(/\s+/).pop() || '';
  const q = encodeURIComponent(`${title} ${authorSurname}`);
  const qPlus = q.replace(/%20/g, '+');

  return [
    {
      name: 'Open Library',
      url: `https://openlibrary.org/search?q=${q}&mode=everything`,
      icon: 'OL',
      description: 'Borrow or read free (Internet Archive)',
    },
    {
      name: 'Internet Archive',
      url: `https://archive.org/search?query=${q}&and[]=mediatype%3A%22texts%22`,
      icon: 'IA',
      description: 'Free digital texts and PDFs',
    },
    {
      name: "Anna's Archive",
      url: `https://annas-archive.org/search?q=${q}`,
      icon: 'AA',
      description: 'Free access to millions of books',
    },
    {
      name: 'Z-Library',
      url: `https://z-library.sk/s/${qPlus}`,
      icon: 'ZL',
      description: 'World\'s largest free ebook library',
    },
    {
      name: 'Library Genesis',
      url: `https://libgen.rs/search.php?req=${qPlus}&open=0&res=25&view=simple&phrase=1&column=def`,
      icon: 'LG',
      description: 'Free scientific papers and books',
    },
    {
      name: 'Google Books',
      url: `https://books.google.com/books?q=${q}`,
      icon: 'GB',
      description: 'Preview and sometimes full text',
    },
  ];
}

// Custom Debounce Hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

const BookReferencePage = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [quoteIndex, setQuoteIndex] = useState(0);

  const [selectedCourse, setSelectedCourse] = useState("ALL");
  const [selectedYear, setSelectedYear] = useState(0);

  const [bookmarked, setBookmarked] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [lastUpdated, setLastUpdated] = useState(null);
  // per-card free-download menu anchors: { [bookId]: HTMLElement }
  const [menuAnchors, setMenuAnchors] = useState({});

  const openMenu = (e, id) => setMenuAnchors(prev => ({ ...prev, [id]: e.currentTarget }));
  const closeMenu = (id) => setMenuAnchors(prev => { const n = { ...prev }; delete n[id]; return n; });

  // Auto-fetch books from the API on mount
  useEffect(() => {
    fetchBooks();

    // Load local bookmarks
    try {
      const saved = JSON.parse(
        localStorage.getItem("medsage_bookmarks") || "[]",
      );
      setBookmarked(saved);
    } catch (e) { }
  }, []);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/library');
      const data = res.data;
      setBooks(data.books || []);
      setLastUpdated(data.lastUpdated);
    } catch (error) {
      console.error("Failed to fetch library:", error);
      setSnackbar({
        open: true,
        message: "Failed to load library. Is the backend running?",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const res = await api.post('/api/v1/library/refresh');
      // 202 = crawl started in background, 200 = done immediately
      if (res.status === 202) {
        setSnackbar({
          open: true,
          message: "Library refresh started in the background. Check back in a few minutes.",
          severity: "info",
        });
      } else if (res.data?.success) {
        setSnackbar({
          open: true,
          message: `Library refreshed. Reloading books...`,
          severity: "success",
        });
        await fetchBooks();
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Refresh failed. Check backend logs.",
        severity: "error",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const toggleBookmark = (id) => {
    setBookmarked((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      localStorage.setItem("medsage_bookmarks", JSON.stringify(next));
      return next;
    });
  };

  const getCategories = () => {
    const cats = new Set();
    books.forEach((b) => {
      if (
        (selectedCourse === "ALL" || b.course === selectedCourse) &&
        (selectedYear === 0 || b.year === selectedYear)
      ) {
        cats.add(b.category);
      }
    });
    return Array.from(cats).sort();
  };

  const filteredBooks = books.filter((b) => {
    if (debouncedSearchTerm) {
      const query = debouncedSearchTerm.toLowerCase();
      const matchText = (
        b.title +
        b.author +
        b.category +
        (b.subjects || []).join(" ")
      ).toLowerCase();
      if (!matchText.includes(query)) return false;
    }
    if (selectedCourse !== "ALL" && b.course !== selectedCourse) return false;
    if (selectedYear !== 0 && b.year !== selectedYear) return false;
    return true;
  });

  const categories = getCategories();

  return (
    <Box
      sx={{
        // Do not force black backgrounds. Integrate naturally with Layout.
        minHeight: "100%",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* ─── Hero Banner ───────────────────────────────── */}
      <Box
        sx={{
          // Bleed out of the Layout container padding
          mt: { xs: -10, md: -16 },
          mx: { xs: -2, sm: -3, md: -6 },
          mb: 6,
          background: isDark
            ? "linear-gradient(135deg, rgba(30,27,75,0.8), rgba(15,23,42,0.95))"
            : "linear-gradient(135deg, #f0fdf4, #e0e7ff)",
          borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
          pt: { xs: 14, md: 18 },
          pb: 6,
          px: { xs: 3, md: 8 },
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow effect */}
        <Box
          sx={{
            position: "absolute",
            top: -150,
            right: -150,
            width: 600,
            height: 600,
            background: isDark
              ? "radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(0,0,0,0) 70%)"
              : "radial-gradient(circle, rgba(99,102,241,0.08) 0%, rgba(255,255,255,0) 70%)",
            borderRadius: "50%",
            filter: "blur(60px)",
            zIndex: 0,
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -100,
            left: -100,
            width: 400,
            height: 400,
            background: isDark
              ? "radial-gradient(circle, rgba(192,132,252,0.15) 0%, rgba(0,0,0,0) 70%)"
              : "radial-gradient(circle, rgba(192,132,252,0.08) 0%, rgba(255,255,255,0) 70%)",
            borderRadius: "50%",
            filter: "blur(60px)",
            zIndex: 0,
          }}
        />

        <Box
          sx={{ position: "relative", zIndex: 1, maxWidth: 1200, mx: "auto" }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            alignItems="center"
            justifyContent="space-between"
            spacing={4}
          >
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="overline"
                sx={{
                  color: isDark ? "#a5b4fc" : "#4f46e5",
                  fontWeight: 800,
                  letterSpacing: 2,
                  mb: 1,
                  display: "block",
                }}
              >
                FOCUS & DISCOVER
              </Typography>
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 900,
                  mb: 1.5,
                  letterSpacing: { xs: "-0.5px", md: "-1.5px" },
                  fontSize: { xs: "1.75rem", sm: "2.5rem", md: "3.5rem" },
                  background: "linear-gradient(90deg, #6366f1, #c084fc)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Academy Library
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: isDark ? "#cbd5e1" : "#475569",
                  fontWeight: 500,
                  maxWidth: 650,
                  lineHeight: 1.6,
                  mb: 1.5,
                  fontStyle: "italic",
                  minHeight: "48px",
                }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={quoteIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.5 }}
                  >
                    "{INSPIRATIONAL_QUOTES[quoteIndex]}"
                  </motion.div>
                </AnimatePresence>
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: isDark ? "#94a3b8" : "#64748b",
                  fontWeight: 400,
                  maxWidth: 650,
                  lineHeight: 1.6,
                }}
              >
                Curated knowledge for the focused medical professional. Access a
                premium collection of clinical texts, high-resolution
                references, and core materials. Step into the quiet and focus.
              </Typography>

              <Stack direction="row" flexWrap="wrap" gap={2} sx={{ mt: 4 }}>
                <Chip
                  icon={<MedicalIcon />}
                  label={`${books.filter((b) => b.course === "MBBS").length} Medicine Titles`}
                  sx={{
                    bgcolor: isDark
                      ? "rgba(99,102,241,0.15)"
                      : "rgba(99,102,241,0.1)",
                    color: isDark ? "#818cf8" : "#4f46e5",
                    fontWeight: 700,
                    borderRadius: 2,
                    px: 1,
                    py: 2.5,
                  }}
                />
                <Chip
                  icon={<DentalIcon />}
                  label={`${books.filter((b) => b.course === "BDS").length} Dental Titles`}
                  sx={{
                    bgcolor: isDark
                      ? "rgba(192,132,252,0.15)"
                      : "rgba(192,132,252,0.1)",
                    color: isDark ? "#c084fc" : "#9333ea",
                    fontWeight: 700,
                    borderRadius: 2,
                    px: 1,
                    py: 2.5,
                  }}
                />
                {lastUpdated && (
                  <Chip
                    label={`Last Scan: ${new Date(lastUpdated).toLocaleDateString()}`}
                    sx={{
                      bgcolor: isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.05)",
                      color: isDark ? "#94a3b8" : "#64748b",
                      fontWeight: 600,
                      borderRadius: 2,
                      px: 1,
                      py: 2.5,
                    }}
                  />
                )}
              </Stack>
            </Box>

            {/* Visual element on the right */}
            <Box
              sx={{
                display: { xs: "none", md: "block" },
                position: "relative",
                width: 280,
                height: 280,
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(192,132,252,0.2))",
                  borderRadius: "30% 70% 70% 30% / 30% 30% 70% 70%",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  transition: "all 0.5s",
                  "&:hover": { borderRadius: "50%" },
                }}
              />
              <motion.div
                animate={{ y: [0, -15, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{
                  position: "absolute",
                  inset: 20,
                  background: "linear-gradient(135deg, #6366f1, #c084fc)",
                  borderRadius: "70% 30% 30% 70% / 70% 70% 30% 30%",
                  opacity: 0.8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <BookIcon
                  sx={{
                    fontSize: 90,
                    color: "#fff",
                    filter: "drop-shadow(0px 8px 16px rgba(0,0,0,0.3))",
                  }}
                />
              </motion.div>
            </Box>
          </Stack>
        </Box>
      </Box>

      {/* ─── Main Content ──────────────────────────────── */}
      <Box sx={{ maxWidth: 1200, mx: "auto" }}>
        {/* ─── Controls ────────────────────────────────── */}
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={3}
          sx={{ mb: 4 }}
          className="reveal-up stagger-1"
        >
          <Paper
            className="glass-card"
            elevation={isDark ? 0 : 2}
            sx={{
              flexGrow: 1,
              p: 0.5,
              borderRadius: 3,
              display: "flex",
              alignItems: "center",
              background: isDark ? "rgba(30,41,59,0.5)" : "#ffffff",
              border: isDark
                ? "1px solid rgba(255,255,255,0.1)"
                : "1px solid rgba(0,0,0,0.05)",
            }}
          >
            <InputAdornment
              position="start"
              sx={{ ml: 2, color: isDark ? "#94a3b8" : "#64748b" }}
            >
              <SearchIcon />
            </InputAdornment>
            <TextField
              fullWidth
              variant="standard"
              placeholder="Search by title, author, category or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                disableUnderline: true,
                sx: {
                  fontSize: "1.05rem",
                  p: 1,
                  color: theme.palette.text.primary,
                },
              }}
            />
          </Paper>
          <Tooltip title="Trigger Google Books API scan">
            <Button
              variant="contained"
              onClick={handleRefresh}
              disabled={refreshing}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 3,
                fontWeight: 700,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "#fff",
                boxShadow: "0 4px 14px 0 rgba(99, 102, 241, 0.39)",
                "&:hover": {
                  background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                  boxShadow: "0 6px 20px rgba(99, 102, 241, 0.4)",
                },
              }}
            >
              {refreshing ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                <RefreshIcon sx={{ mr: 1 }} />
              )}
              {refreshing ? "Scanning..." : "Fetch New Books"}
            </Button>
          </Tooltip>
        </Stack>

        {/* ─── Unified Filter Bar ───────────────────────── */}
        <Paper
          elevation={isDark ? 0 : 1}
          className="reveal-up stagger-2"
          sx={{
            mb: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: 0,
            background: isDark ? "rgba(30,41,59,0.5)" : "#fff",
            borderRadius: 3,
            border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
            overflow: "hidden",
            px: 1.5,
            py: 1,
          }}
        >
          {/* — Course pills — */}
          <Stack direction="row" spacing={0.5} alignItems="center">
            {Object.entries(COURSE_LABELS).map(([val, label]) => (
              <Button
                key={val}
                size="small"
                startIcon={
                  val === "MBBS" ? <MedicalIcon sx={{ fontSize: "14px !important" }} /> :
                    val === "BDS" ? <DentalIcon sx={{ fontSize: "14px !important" }} /> :
                      null
                }
                onClick={() => setSelectedCourse(val)}
                disableElevation
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  px: 1.5,
                  py: 0.5,
                  minHeight: 32,
                  bgcolor: selectedCourse === val
                    ? isDark ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.12)"
                    : "transparent",
                  color: selectedCourse === val
                    ? isDark ? "#a5b4fc" : "#4f46e5"
                    : isDark ? "#64748b" : "#94a3b8",
                  border: selectedCourse === val
                    ? `1.5px solid ${isDark ? "rgba(99,102,241,0.4)" : "rgba(99,102,241,0.3)"}`
                    : "1.5px solid transparent",
                  "&:hover": {
                    bgcolor: isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.07)",
                    color: isDark ? "#a5b4fc" : "#4f46e5",
                  },
                  transition: "all 0.18s",
                }}
              >
                {label}
              </Button>
            ))}
          </Stack>

          {/* Divider */}
          <Box sx={{ width: "1px", height: 24, bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)", mx: 1.5, flexShrink: 0 }} />

          {/* — Year pills — */}
          <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center" flexGrow={1} flexWrap="wrap">
            {Object.entries(YEAR_LABELS).map(([val, label]) => (
              <Button
                key={val}
                size="small"
                onClick={() => setSelectedYear(parseInt(val))}
                disableElevation
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  px: 1.5,
                  py: 0.5,
                  minHeight: 32,
                  bgcolor: selectedYear === parseInt(val)
                    ? isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.07)"
                    : "transparent",
                  color: selectedYear === parseInt(val)
                    ? theme.palette.text.primary
                    : isDark ? "#64748b" : "#94a3b8",
                  border: selectedYear === parseInt(val)
                    ? `1.5px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)"}`
                    : "1.5px solid transparent",
                  "&:hover": {
                    bgcolor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
                    color: theme.palette.text.primary,
                  },
                  transition: "all 0.18s",
                }}
              >
                {label}
              </Button>
            ))}
          </Stack>
        </Paper>

        {/* ─── Category Chips ──────────────────────────── */}
        {categories.length > 1 && (
          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            sx={{ mb: 4, gap: 1 }}
            className="reveal-up stagger-3"
          >
            {categories.map((cat) => (
              <Chip
                key={cat}
                label={cat}
                size="small"
                onClick={() => setSearchTerm(cat === searchTerm ? "" : cat)}
                sx={{
                  fontWeight: 600,
                  px: 0.5,
                  bgcolor:
                    searchTerm === cat
                      ? "#6366f1"
                      : isDark
                        ? "rgba(99,102,241,0.1)"
                        : "rgba(99,102,241,0.08)",
                  color:
                    searchTerm === cat
                      ? "#fff"
                      : isDark
                        ? "#818cf8"
                        : "#4f46e5",
                  border: `1px solid ${isDark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.3)"}`,
                  "&:hover": {
                    bgcolor: isDark
                      ? "rgba(99,102,241,0.25)"
                      : "rgba(99,102,241,0.15)",
                    transform: "translateY(-1px)",
                  },
                  transition: "all 0.2s",
                }}
              />
            ))}
          </Stack>
        )}

        {/* ─── Loading State ───────────────────────────── */}
        {loading && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
                lg: "repeat(4, 1fr)",
              },
              gap: 2.5,
              mt: 2,
            }}
          >
            {Array.from(new Array(8)).map((_, i) => (
              <Card
                key={`skeleton-${i}`}
                sx={{
                  p: 1.5,
                  borderRadius: 3,
                  bgcolor: isDark ? "rgba(30,41,59,0.5)" : "#fff",
                }}
              >
                <Skeleton
                  variant="rectangular"
                  height={140}
                  sx={{
                    borderRadius: 2,
                    bgcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                  }}
                />
                <Skeleton variant="text" sx={{ mt: 1.5, fontSize: "1rem", bgcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }} />
                <Skeleton variant="text" width="60%" sx={{ bgcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }} />
                <Skeleton variant="rounded" height={32} sx={{ mt: 1.5, bgcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }} />
              </Card>
            ))}
          </Box>
        )}

        {/* ─── Book Grid ───────────────────────────────── */}
        {!loading && (
          <>
            <Typography
              variant="subtitle1"
              sx={{
                color: theme.palette.text.secondary,
                mb: 3,
                fontWeight: 600,
              }}
            >
              Showing {filteredBooks.length} titles
            </Typography>

            {filteredBooks.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 10 }}>
                <ReadIcon
                  sx={{
                    fontSize: 64,
                    color: isDark ? "#334155" : "#e2e8f0",
                    mb: 2,
                  }}
                />
                {books.length === 0 ? (
                  <>
                    <Typography variant="h5" sx={{ color: isDark ? "#cbd5e1" : "#64748b", fontWeight: 700, mb: 1 }}>
                      Library not populated yet
                    </Typography>
                    <Typography sx={{ color: theme.palette.text.secondary, mb: 3, maxWidth: 440, mx: "auto" }}>
                      The book library hasn't been set up. Click "Refresh Library" above to crawl and populate it. This may take a few minutes.
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<RefreshIcon />}
                      onClick={handleRefresh}
                      disabled={refreshing}
                      sx={{ borderRadius: 3, fontWeight: 700 }}
                    >
                      {refreshing ? "Starting..." : "Refresh Library"}
                    </Button>
                  </>
                ) : (
                  <>
                    <Typography variant="h5" sx={{ color: isDark ? "#cbd5e1" : "#64748b", fontWeight: 600 }}>
                      No books found.
                    </Typography>
                    <Typography sx={{ color: theme.palette.text.secondary }}>
                      Try clearing your search or switching courses/years.
                    </Typography>
                  </>
                )}
              </Box>
            ) : (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, 1fr)",
                    md: "repeat(3, 1fr)",
                    lg: "repeat(4, 1fr)",
                  },
                  gap: 2.5,
                  alignItems: "stretch",
                }}
              >
                <AnimatePresence>
                  {filteredBooks.map((book, index) => (
                    <motion.div
                      key={book.id || index}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.35, delay: (index % 12) * 0.04 }}
                      style={{ display: "flex" }}
                    >
                      <Card
                        elevation={isDark ? 0 : 2}
                        sx={{
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          flexGrow: 1,
                          bgcolor: isDark ? "rgba(30,41,59,0.7)" : "#fff",
                          borderRadius: 4,
                          border: isDark
                            ? "1px solid rgba(255,255,255,0.05)"
                            : "1px solid rgba(0,0,0,0.05)",
                          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                          position: "relative",
                          overflow: "hidden",
                          "&:hover": {
                            transform: "translateY(-6px)",
                            boxShadow: isDark
                              ? "0 20px 40px -10px rgba(0,0,0,0.5)"
                              : "0 20px 40px -10px rgba(0,0,0,0.1)",
                            borderColor: "rgba(99,102,241,0.3)",
                            "& .book-cover-img": { transform: "scale(1.05)" },
                          },
                          "@media (hover: none)": {
                            "&:hover": { transform: "none" },
                          },
                          "&:active": { transform: "scale(0.98)" },
                        }}
                      >
                        {/* Course/Category Badge */}
                        <Box
                          sx={{
                            position: "absolute",
                            top: 12,
                            left: 12,
                            zIndex: 10,
                            background: isDark
                              ? "rgba(15,23,42,0.8)"
                              : "rgba(255,255,255,0.9)",
                            backdropFilter: "blur(8px)",
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 2,
                            border: `1px solid ${book.course === "BDS" ? "#c084fc" : "#818cf8"}`,
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          }}
                        >
                          {book.course === "BDS" ? (
                            <DentalIcon
                              sx={{
                                fontSize: 14,
                                color: isDark ? "#c084fc" : "#9333ea",
                              }}
                            />
                          ) : (
                            <MedicalIcon
                              sx={{
                                fontSize: 14,
                                color: isDark ? "#818cf8" : "#4f46e5",
                              }}
                            />
                          )}
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 800,
                              color:
                                book.course === "BDS"
                                  ? isDark
                                    ? "#c084fc"
                                    : "#9333ea"
                                  : isDark
                                    ? "#818cf8"
                                    : "#4f46e5",
                            }}
                          >
                            {book.course}
                          </Typography>
                        </Box>

                        {/* Bookmark */}
                        <IconButton
                          onClick={() => toggleBookmark(book.id)}
                          sx={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            zIndex: 10,
                            background: isDark
                              ? "rgba(15,23,42,0.6)"
                              : "rgba(255,255,255,0.8)",
                            backdropFilter: "blur(4px)",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                            "&:hover": {
                              background: isDark
                                ? "rgba(15,23,42,0.9)"
                                : "#fff",
                            },
                          }}
                        >
                          {bookmarked.includes(book.id) ? (
                            <BookmarkIcon sx={{ color: "#f59e0b" }} />
                          ) : (
                            <BookmarkBorderIcon
                              sx={{ color: isDark ? "#fff" : "#475569" }}
                            />
                          )}
                        </IconButton>

                        {/* Cover Image Wrapper */}
                        <Box
                          sx={{
                            position: "relative",
                            width: "100%",
                            pt: "75%",
                            overflow: "hidden",
                            bgcolor: isDark ? "#0f172a" : "#f8fafc",
                          }}
                        >
                          {getCoverSrc(book) ? (
                            <Box
                              className="book-cover-img"
                              component="img"
                              src={getCoverSrc(book)}
                              alt={book.title}
                              sx={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                transition: "transform 0.5s",
                                opacity: isDark ? 0.95 : 1,
                              }}
                              onError={(e) => {
                                // On image load failure, hide img and show gradient placeholder
                                e.target.style.display = 'none';
                                const parent = e.target.parentElement;
                                if (parent && !parent.querySelector('.cover-fallback')) {
                                  const fallback = document.createElement('div');
                                  fallback.className = 'cover-fallback';
                                  fallback.style.cssText = `position:absolute;inset:0;background:${getCoverGradient(book.category)};display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px;text-align:center;`;
                                  const initial = document.createElement('span');
                                  initial.textContent = book.title.charAt(0);
                                  initial.style.cssText = 'font-size:2.8rem;font-weight:900;color:rgba(255,255,255,0.25);line-height:1';

                                  const title = document.createElement('span');
                                  title.textContent = book.title;
                                  title.style.cssText = 'color:rgba(255,255,255,0.92);font-weight:800;font-size:0.65rem;line-height:1.3;margin-top:4px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical';

                                  fallback.appendChild(initial);
                                  fallback.appendChild(title);
                                  parent.appendChild(fallback);
                                }
                              }}
                            />
                          ) : (
                            // ── Gradient Placeholder Cover ──
                            <Box
                              sx={{
                                position: "absolute",
                                top: 0, left: 0,
                                width: "100%", height: "100%",
                                background: getCoverGradient(book.category),
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                p: 1.5,
                                textAlign: "center",
                              }}
                            >
                              {/* Big initial letter */}
                              <Typography
                                sx={{
                                  fontSize: "2.8rem",
                                  fontWeight: 900,
                                  color: "rgba(255,255,255,0.25)",
                                  lineHeight: 1,
                                  mb: 0.5,
                                  userSelect: "none",
                                }}
                              >
                                {book.title.charAt(0)}
                              </Typography>
                              <Typography
                                sx={{
                                  color: "rgba(255,255,255,0.92)",
                                  fontWeight: 800,
                                  fontSize: "0.65rem",
                                  lineHeight: 1.3,
                                  display: "-webkit-box",
                                  WebkitLineClamp: 3,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                  textShadow: "0 1px 4px rgba(0,0,0,0.3)",
                                }}
                              >
                                {book.title}
                              </Typography>
                              <Typography
                                sx={{
                                  color: "rgba(255,255,255,0.65)",
                                  fontWeight: 600,
                                  fontSize: "0.6rem",
                                  mt: 0.5,
                                  display: "-webkit-box",
                                  WebkitLineClamp: 1,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                }}
                              >
                                {book.author}
                              </Typography>
                            </Box>
                          )}
                          {/* Gradient Overlay bottom to top */}
                          <Box
                            sx={{
                              position: "absolute",
                              bottom: 0,
                              left: 0,
                              width: "100%",
                              height: "50%",
                              background: isDark
                                ? "linear-gradient(to top, rgba(30,41,59,1) 0%, rgba(30,41,59,0) 100%)"
                                : "linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)",
                            }}
                          />
                        </Box>

                        {/* Card Content */}
                        <Box
                          sx={{
                            p: 2,
                            pt: 0,
                            flexGrow: 1,
                            display: "flex",
                            flexDirection: "column",
                            position: "relative",
                            zIndex: 2,
                          }}
                        >
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{ mb: 1.5, mt: -2 }}
                          >
                            <Chip
                              label={book.category}
                              size="small"
                              sx={{
                                bgcolor: isDark
                                  ? "rgba(99,102,241,0.2)"
                                  : "rgba(99,102,241,0.1)",
                                color: isDark ? "#a5b4fc" : "#4f46e5",
                                fontWeight: 700,
                                fontSize: "0.7rem",
                                height: 20,
                              }}
                            />
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={0.5}
                            >
                              <StarIcon
                                sx={{ color: "#f59e0b", fontSize: 16 }}
                              />
                              <Typography
                                variant="caption"
                                sx={{
                                  fontWeight: 700,
                                  color: theme.palette.text.primary,
                                }}
                              >
                                {book.rating}
                              </Typography>
                            </Stack>
                          </Stack>

                          <Typography
                            variant="body1"
                            sx={{
                              color: theme.palette.text.primary,
                              fontWeight: 800,
                              lineHeight: 1.25,
                              fontSize: "0.875rem",
                              mb: 0.5,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {book.title}
                          </Typography>

                          <Typography
                            variant="caption"
                            sx={{
                              color: theme.palette.text.secondary,
                              mb: 0.5,
                              fontWeight: 600,
                              display: "-webkit-box",
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {book.author || "Unknown Author"}
                          </Typography>

                          {/* Year + Pages info row */}
                          <Stack direction="row" spacing={1} sx={{ mb: 0.75 }} flexWrap="wrap">
                            <Chip
                              label={`Year ${book.year}`}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: "0.62rem",
                                fontWeight: 700,
                                bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                                color: theme.palette.text.secondary,
                              }}
                            />
                            {book.pageCount && (
                              <Chip
                                label={`${book.pageCount} pp`}
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: "0.62rem",
                                  fontWeight: 600,
                                  bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                                  color: theme.palette.text.secondary,
                                }}
                              />
                            )}
                            {book.isbn && (
                              <Chip
                                label={`ISBN`}
                                size="small"
                                component="a"
                                href={`https://openlibrary.org/isbn/${book.isbn}`}
                                target="_blank"
                                clickable
                                sx={{
                                  height: 18,
                                  fontSize: "0.62rem",
                                  fontWeight: 600,
                                  bgcolor: isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)",
                                  color: isDark ? "#818cf8" : "#4f46e5",
                                  cursor: "pointer",
                                }}
                              />
                            )}
                          </Stack>

                          <Typography
                            variant="caption"
                            sx={{
                              color: theme.palette.text.secondary,
                              mb: 1.5,
                              flexGrow: 1,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              lineHeight: 1.5,
                            }}
                          >
                            {book.description}
                          </Typography>

                          {/* ── Action row ── */}
                          <Stack
                            direction="row"
                            spacing={0.75}
                            sx={{
                              mt: "auto",
                              pt: 1.5,
                              borderTop: isDark
                                ? "1px solid rgba(255,255,255,0.05)"
                                : "1px solid rgba(0,0,0,0.05)",
                            }}
                          >
                            {/* Primary: direct read/search */}
                            <Button
                              size="small"
                              variant="contained"
                              href={getPrimaryLink(book)}
                              target="_blank"
                              rel="noopener noreferrer"
                              startIcon={book.hasVerifiedLink ? <DownloadIcon sx={{ fontSize: 14 }} /> : <OpenInNewIcon sx={{ fontSize: 14 }} />}
                              sx={{
                                flexGrow: 1,
                                borderRadius: 2,
                                textTransform: "none",
                                fontWeight: 700,
                                fontSize: "0.7rem",
                                py: 0.6,
                                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                color: "#fff",
                                boxShadow: "0 3px 10px rgba(99,102,241,0.35)",
                                "&:hover": {
                                  background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                                  boxShadow: "0 5px 16px rgba(99,102,241,0.45)",
                                },
                              }}
                            >
                              {book.hasVerifiedLink ? "Read Free" : "Find Book"}
                            </Button>

                            {/* Free downloads dropdown */}
                            <Tooltip title="Free download sources">
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={(e) => openMenu(e, book.id)}
                                sx={{
                                  minWidth: 0,
                                  px: 1,
                                  py: 0.6,
                                  borderRadius: 2,
                                  fontSize: "0.68rem",
                                  fontWeight: 700,
                                  textTransform: "none",
                                  borderColor: isDark ? "rgba(255,255,255,0.12)" : "#e2e8f0",
                                  color: isDark ? "#94a3b8" : "#64748b",
                                  "&:hover": {
                                    borderColor: "#6366f1",
                                    color: "#6366f1",
                                    bgcolor: isDark ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.05)",
                                  },
                                }}
                              >
                                🔗
                              </Button>
                            </Tooltip>

                            {/* Free Downloads Menu */}
                            <Menu
                              anchorEl={menuAnchors[book.id]}
                              open={Boolean(menuAnchors[book.id])}
                              onClose={() => closeMenu(book.id)}
                              transformOrigin={{ vertical: "bottom", horizontal: "right" }}
                              anchorOrigin={{ vertical: "top", horizontal: "right" }}
                              PaperProps={{
                                sx: {
                                  borderRadius: 3,
                                  bgcolor: isDark ? "#1e293b" : "#fff",
                                  border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e2e8f0",
                                  boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
                                  minWidth: 230,
                                  py: 0.5,
                                },
                              }}
                            >
                              <Typography
                                sx={{
                                  px: 2, py: 0.75,
                                  fontSize: "0.65rem",
                                  fontWeight: 800,
                                  color: isDark ? "#475569" : "#94a3b8",
                                  textTransform: "uppercase",
                                  letterSpacing: 1,
                                }}
                              >
                                Free Resources
                              </Typography>
                              {getReliableFreeLinks(book).map((link) => (
                                <MenuItem
                                  key={link.name}
                                  component="a"
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => closeMenu(book.id)}
                                  sx={{
                                    py: 1,
                                    px: 2,
                                    gap: 1.5,
                                    "&:hover": {
                                      bgcolor: isDark ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.05)",
                                    },
                                  }}
                                >
                                  <Box
                                    sx={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: 1.5,
                                      background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      flexShrink: 0,
                                    }}
                                  >
                                    <Typography sx={{ fontSize: "0.6rem", fontWeight: 900, color: "#fff" }}>
                                      {link.icon}
                                    </Typography>
                                  </Box>
                                  <Box>
                                    <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: theme.palette.text.primary, lineHeight: 1.2 }}>
                                      {link.name}
                                    </Typography>
                                    <Typography sx={{ fontSize: "0.65rem", color: theme.palette.text.secondary, lineHeight: 1.3 }}>
                                      {link.description}
                                    </Typography>
                                  </Box>
                                </MenuItem>
                              ))}
                            </Menu>

                            {/* Google Books preview icon */}
                            {book.previewLink && (
                              <Tooltip title="Preview on Google Books">
                                <IconButton
                                  size="small"
                                  href={book.previewLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  sx={{
                                    p: 0.6,
                                    borderRadius: 2,
                                    border: isDark
                                      ? "1px solid rgba(255,255,255,0.1)"
                                      : "1px solid #e2e8f0",
                                    color: isDark ? "#818cf8" : "#6366f1",
                                    "&:hover": {
                                      bgcolor: isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.05)",
                                    },
                                  }}
                                >
                                  <OpenInNewIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </Box>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </Box>
            )}
          </>
        )}
      </Box>

      {/* Snackbar alerts */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%", borderRadius: 3, fontWeight: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BookReferencePage;
