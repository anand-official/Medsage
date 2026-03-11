// TextbookReferencesPage.js
import React, { useState, useContext } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  useTheme,
  Divider,
  Button,
  Rating,
  Avatar,
  Tooltip,
  Fade,
  Paper
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import BookIcon from '@mui/icons-material/Book';
import FilterListIcon from '@mui/icons-material/FilterList';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import ShareIcon from '@mui/icons-material/Share';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeContext } from '../App';
import { usePageAnimation } from '../hooks/usePageAnimation';

// Sample textbook data - in a real app this would come from an API
const TEXTBOOKS = [
  {
    id: 1,
    title: "Gray's Anatomy",
    author: "Henry Gray",
    edition: "42nd Edition",
    year: 2020,
    subjects: ["Anatomy", "Clinical Medicine"],
    description: "The definitive reference for human anatomy, featuring detailed illustrations and comprehensive coverage of anatomical structures.",
    rating: 4.8,
    reviews: 1250,
    coverImage: "https://example.com/gray-anatomy.jpg",
    isBookmarked: false,
    chapters: 45,
    pages: 1560,
    lastUpdated: "2023-12-15"
  },
  {
    id: 2,
    title: "Harrison's Principles of Internal Medicine",
    author: "Dennis L. Kasper",
    edition: "21st Edition",
    year: 2022,
    subjects: ["Internal Medicine", "Clinical Medicine"],
    description: "The world's leading internal medicine reference, providing comprehensive coverage of diseases and their management.",
    rating: 4.9,
    reviews: 2300,
    coverImage: "https://example.com/harrison.jpg",
    isBookmarked: true,
    chapters: 52,
    pages: 2800,
    lastUpdated: "2023-11-30"
  },
  {
    id: 3,
    title: "Robbins Basic Pathology",
    author: "Vinay Kumar",
    edition: "10th Edition",
    year: 2021,
    subjects: ["Pathology", "Clinical Medicine"],
    description: "Essential pathology textbook covering the mechanisms of disease and their clinical manifestations.",
    rating: 4.7,
    reviews: 980,
    coverImage: "https://example.com/robbins.jpg",
    isBookmarked: false,
    chapters: 38,
    pages: 1450,
    lastUpdated: "2023-10-20"
  },
  {
    id: 4,
    title: "Guyton and Hall Textbook of Medical Physiology",
    author: "John E. Hall",
    edition: "14th Edition",
    year: 2020,
    subjects: ["Physiology", "Basic Sciences"],
    description: "Comprehensive coverage of medical physiology with clinical correlations and applications.",
    rating: 4.8,
    reviews: 1500,
    coverImage: "https://example.com/guyton.jpg",
    isBookmarked: true,
    chapters: 42,
    pages: 1680,
    lastUpdated: "2023-09-15"
  }
];

const TextbookReferencesPage = () => {
  usePageAnimation();
  const { mode } = useContext(ThemeContext);
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('rating');
  const [bookmarkedBooks, setBookmarkedBooks] = useState(
    TEXTBOOKS.filter(book => book.isBookmarked).map(book => book.id)
  );

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  // Filter and sort textbooks
  const filteredTextbooks = TEXTBOOKS.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         book.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSubjects = selectedSubjects.length === 0 ||
                           book.subjects.some(subject => selectedSubjects.includes(subject));
    
    return matchesSearch && matchesSubjects;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.rating - a.rating;
      case 'reviews':
        return b.reviews - a.reviews;
      case 'year':
        return b.year - a.year;
      default:
        return 0;
    }
  });

  // Get unique subjects from all textbooks
  const allSubjects = [...new Set(TEXTBOOKS.flatMap(book => book.subjects))];

  // Toggle bookmark
  const toggleBookmark = (bookId) => {
    setBookmarkedBooks(prev =>
      prev.includes(bookId)
        ? prev.filter(id => id !== bookId)
        : [...prev, bookId]
    );
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Page Header with Background Effect */}
        <motion.div variants={itemVariants}>
          <Box sx={{ 
            position: 'relative',
            mb: 6,
            '&::before': {
              content: '""',
              position: 'absolute',
              top: -100,
              left: -100,
              right: -100,
              height: '300px',
              background: `radial-gradient(circle at center, ${theme.palette.primary.main}15 0%, transparent 70%)`,
              zIndex: -1
            }
          }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              position: 'relative'
            }}>
              <Typography 
                variant="h3" 
                component="h1" 
                sx={{ 
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  textShadow: `0 2px 10px ${theme.palette.primary.main}40`,
                  letterSpacing: '-0.5px'
                }}
              >
                <BookIcon sx={{ 
                  mr: 2, 
                  fontSize: 40,
                  filter: `drop-shadow(0 2px 4px ${theme.palette.primary.main}40)` 
                }} />
                Medical Textbook References
              </Typography>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant={viewMode === 'grid' ? 'contained' : 'outlined'}
                  onClick={() => setViewMode('grid')}
                  startIcon={<GridViewIcon />}
                  sx={{ borderRadius: 2 }}
                >
                  Grid
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'contained' : 'outlined'}
                  onClick={() => setViewMode('list')}
                  startIcon={<ViewListIcon />}
                  sx={{ borderRadius: 2 }}
                >
                  List
                </Button>
              </Box>
            </Box>

            <Typography 
              variant="subtitle1" 
              color="text.secondary"
              sx={{ 
                mt: 2,
                maxWidth: 600,
                lineHeight: 1.6
              }}
            >
              Discover and explore comprehensive medical textbooks, from anatomy to clinical practice. 
              Find the perfect reference for your studies and research.
            </Typography>
          </Box>
        </motion.div>

        {/* Search and Filter Section */}
        <motion.div variants={itemVariants}>
          <Card 
            elevation={0}
            sx={{ 
              mb: 4,
              background: theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, rgba(45, 45, 45, 0.95) 0%, rgba(30, 30, 30, 0.95) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(245, 247, 250, 0.95) 100%)',
              backdropFilter: 'blur(10px)',
              borderRadius: 3,
              border: `1px solid ${theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.1)' 
                : 'rgba(0, 0, 0, 0.1)'}`,
              boxShadow: theme.palette.mode === 'dark'
                ? '0 4px 30px rgba(0, 0, 0, 0.5)'
                : '0 4px 30px rgba(0, 0, 0, 0.1)'
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Search textbooks by title, author, or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: theme.palette.primary.main }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          '& fieldset': {
                            borderColor: theme.palette.primary.main
                          }
                        }
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {allSubjects.map((subject) => (
                      <Chip
                        key={subject}
                        label={subject}
                        onClick={() => {
                          setSelectedSubjects(prev =>
                            prev.includes(subject)
                              ? prev.filter(s => s !== subject)
                              : [...prev, subject]
                          );
                        }}
                        color={selectedSubjects.includes(subject) ? "primary" : "default"}
                        sx={{
                          borderRadius: 1,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            transform: 'translateY(-2px)'
                          }
                        }}
                      />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sort Options */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography variant="subtitle2" color="text.secondary">
            Sort by:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {['rating', 'reviews', 'year'].map((option) => (
              <Chip
                key={option}
                label={option.charAt(0).toUpperCase() + option.slice(1)}
                onClick={() => setSortBy(option)}
                color={sortBy === option ? "primary" : "default"}
                sx={{
                  borderRadius: 1,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)'
                  }
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Textbook Grid/List */}
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Grid container spacing={3}>
              {filteredTextbooks.map((book) => (
                <Grid item xs={12} md={viewMode === 'grid' ? 6 : 12} key={book.id}>
                  <motion.div variants={itemVariants}>
                    <Card 
                      elevation={0}
                      sx={{ 
                        height: '100%',
                        background: theme.palette.mode === 'dark'
                          ? 'linear-gradient(135deg, rgba(45, 45, 45, 0.95) 0%, rgba(30, 30, 30, 0.95) 100%)'
                          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(245, 247, 250, 0.95) 100%)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 3,
                        border: `1px solid ${theme.palette.mode === 'dark' 
                          ? 'rgba(255, 255, 255, 0.1)' 
                          : 'rgba(0, 0, 0, 0.1)'}`,
                        boxShadow: theme.palette.mode === 'dark'
                          ? '0 4px 30px rgba(0, 0, 0, 0.5)'
                          : '0 4px 30px rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: theme.palette.mode === 'dark'
                            ? '0 8px 40px rgba(0, 0, 0, 0.6)'
                            : '0 8px 40px rgba(0, 0, 0, 0.15)',
                          '& .book-cover': {
                            transform: 'scale(1.05)',
                            '&::after': {
                              opacity: 0.1
                            }
                          }
                        }
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Grid container spacing={3}>
                          {/* Book Cover Image */}
                          <Grid item xs={12} md={viewMode === 'grid' ? 12 : 3}>
                            <Box
                              className="book-cover"
                              sx={{
                                width: '100%',
                                height: viewMode === 'grid' ? 200 : 150,
                                borderRadius: 2,
                                overflow: 'hidden',
                                position: 'relative',
                                background: `linear-gradient(135deg, ${theme.palette.primary.main}20, ${theme.palette.secondary.main}20)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.3s ease',
                                '&::after': {
                                  content: '""',
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  background: `linear-gradient(135deg, ${theme.palette.primary.main}40, ${theme.palette.secondary.main}40)`,
                                  opacity: 0,
                                  transition: 'opacity 0.3s ease'
                                }
                              }}
                            >
                              <BookIcon sx={{ 
                                fontSize: 60,
                                color: theme.palette.primary.main,
                                opacity: 0.5,
                                filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))'
                              }} />
                            </Box>
                          </Grid>

                          {/* Book Details */}
                          <Grid item xs={12} md={viewMode === 'grid' ? 12 : 9}>
                            <Box sx={{ 
                              display: 'flex', 
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              mb: 2
                            }}>
                              <Typography 
                                variant="h6" 
                                sx={{ 
                                  fontWeight: 600,
                                  color: theme.palette.primary.main,
                                  flex: 1,
                                  textShadow: `0 2px 4px ${theme.palette.primary.main}20`
                                }}
                              >
                                {book.title}
                              </Typography>
                              
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Tooltip title="Bookmark">
                                  <IconButton 
                                    onClick={() => toggleBookmark(book.id)}
                                    sx={{ 
                                      color: bookmarkedBooks.includes(book.id) 
                                        ? theme.palette.primary.main 
                                        : 'text.secondary',
                                      transition: 'all 0.2s ease',
                                      '&:hover': {
                                        transform: 'scale(1.1)',
                                        color: theme.palette.primary.main
                                      }
                                    }}
                                  >
                                    {bookmarkedBooks.includes(book.id) 
                                      ? <BookmarkIcon /> 
                                      : <BookmarkBorderIcon />}
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Share">
                                  <IconButton 
                                    color="primary"
                                    sx={{
                                      transition: 'all 0.2s ease',
                                      '&:hover': {
                                        transform: 'scale(1.1)'
                                      }
                                    }}
                                  >
                                    <ShareIcon />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </Box>
                            
                            <Typography 
                              variant="subtitle2" 
                              color="text.secondary" 
                              gutterBottom
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                              }}
                            >
                              <span>{book.author}</span>
                              <span>•</span>
                              <span>{book.edition}</span>
                              <span>•</span>
                              <span>{book.year}</span>
                            </Typography>

                            <Box sx={{ my: 2 }}>
                              {book.subjects.map((subject) => (
                                <Chip
                                  key={subject}
                                  label={subject}
                                  size="small"
                                  sx={{
                                    mr: 1,
                                    mb: 1,
                                    borderRadius: 1,
                                    bgcolor: `${theme.palette.primary.main}15`,
                                    borderColor: `${theme.palette.primary.main}30`,
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                      bgcolor: `${theme.palette.primary.main}25`,
                                      transform: 'translateY(-2px)'
                                    }
                                  }}
                                />
                              ))}
                            </Box>

                            <Typography 
                              variant="body2" 
                              color="text.secondary"
                              sx={{ 
                                mb: 2,
                                lineHeight: 1.6
                              }}
                            >
                              {book.description}
                            </Typography>

                            <Divider sx={{ 
                              my: 2,
                              background: `linear-gradient(90deg, transparent, ${theme.palette.primary.main}30, transparent)`
                            }} />

                            <Grid container spacing={2}>
                              <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="text.secondary">
                                  Rating
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Rating 
                                    value={book.rating} 
                                    precision={0.1} 
                                    readOnly 
                                    size="small"
                                    icon={<StarIcon fontSize="inherit" />}
                                    emptyIcon={<StarBorderIcon fontSize="inherit" />}
                                    sx={{
                                      '& .MuiRating-iconFilled': {
                                        color: theme.palette.primary.main
                                      }
                                    }}
                                  />
                                  <Typography variant="body2">
                                    {book.rating}
                                  </Typography>
                                </Box>
                              </Grid>
                              <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="text.secondary">
                                  Reviews
                                </Typography>
                                <Typography variant="body2">
                                  {book.reviews.toLocaleString()}
                                </Typography>
                              </Grid>
                              <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="text.secondary">
                                  Chapters
                                </Typography>
                                <Typography variant="body2">
                                  {book.chapters}
                                </Typography>
                              </Grid>
                              <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="text.secondary">
                                  Pages
                                </Typography>
                                <Typography variant="body2">
                                  {book.pages.toLocaleString()}
                                </Typography>
                              </Grid>
                            </Grid>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </Container>
  );
};

export default TextbookReferencesPage; 