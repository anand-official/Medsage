import React, { useState, useContext, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, CardMedia, 
  Tabs, Tab, TextField, InputAdornment, Chip, Divider,
  List, ListItem, ListItemText, Rating, Button, Alert, IconButton,
  Container
} from '@mui/material';
import {
  Search as SearchIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  OpenInNew as OpenInNewIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useStudyContext } from '../contexts/StudyContext';
import { useNavigate } from 'react-router-dom';

// Mock book data - in a real app, this would come from an API
const booksByProgram = {
  'Indian MBBS': [
    {
      id: 'gray-anatomy',
      title: "Gray's Anatomy",
      author: "Henry Gray, H.V. Carter",
      publisher: "Elsevier",
      year: "2020",
      edition: "42nd",
      category: "Anatomy",
      rating: 4.8,
      coverUrl: "https://m.media-amazon.com/images/I/51OvXhGlHvL._SX218_BO1,204,203,200_QL40_FMwebp_.jpg",
      description: "A comprehensive reference on human anatomy used by students around the world.",
      recommended: true
    },
    {
      id: 'robbins-pathology',
      title: "Robbins Basic Pathology",
      author: "Vinay Kumar, Abul K. Abbas",
      publisher: "Elsevier",
      year: "2017",
      edition: "10th",
      category: "Pathology",
      rating: 4.7,
      coverUrl: "https://m.media-amazon.com/images/I/51vNlOB9qAL._SX389_BO1,204,203,200_.jpg",
      description: "Presents key principles of human pathology in a straightforward manner.",
      recommended: true
    },
    {
      id: 'harrison-medicine',
      title: "Harrison's Principles of Internal Medicine",
      author: "J. Larry Jameson, Anthony Fauci, Dennis Kasper",
      publisher: "McGraw-Hill",
      year: "2022",
      edition: "21st",
      category: "Internal Medicine",
      rating: 4.9,
      coverUrl: "https://m.media-amazon.com/images/I/61RTFhRa1jL._SX218_BO1,204,203,200_QL40_FMwebp_.jpg",
      description: "The definitive guide to internal medicine for practitioners and students.",
      recommended: true
    }
  ],
  'US MD': [
    {
      id: 'first-aid-usmle',
      title: "First Aid for the USMLE Step 1",
      author: "Tao Le, Vikas Bhushan",
      publisher: "McGraw-Hill",
      year: "2023",
      edition: "2023",
      category: "USMLE",
      rating: 4.9,
      coverUrl: "https://m.media-amazon.com/images/I/51FpIfDQwEL._SX218_BO1,204,203,200_QL40_FMwebp_.jpg",
      description: "The most comprehensive and widely-used review book for the USMLE Step 1 examination.",
      recommended: true
    },
    {
      id: 'netter-anatomy',
      title: "Atlas of Human Anatomy",
      author: "Frank H. Netter",
      publisher: "Elsevier",
      year: "2018",
      edition: "7th",
      category: "Anatomy",
      rating: 4.8,
      coverUrl: "https://m.media-amazon.com/images/I/51RbqV7IsxL._SX218_BO1,204,203,200_QL40_FMwebp_.jpg",
      description: "A world-renowned gold standard in human anatomy illustrations.",
      recommended: true
    }
  ],
  'UK MBBS': [
    {
      id: 'oxford-handbook',
      title: "Oxford Handbook of Clinical Medicine",
      author: "Ian B. Wilkinson, Tim Raine",
      publisher: "Oxford University Press",
      year: "2020",
      edition: "10th",
      category: "Clinical Medicine",
      rating: 4.8,
      coverUrl: "https://m.media-amazon.com/images/I/41EpI2YYz-L._SX218_BO1,204,203,200_QL40_FMwebp_.jpg",
      description: "Provides practical advice on clinical management and offers insight into clinical examinations.",
      recommended: true
    }
  ],
  'Canadian MD': [
    {
      id: 'toronto-notes',
      title: "Toronto Notes for Medical Students",
      author: "Toronto Notes for Medical Students, Inc.",
      publisher: "Toronto Notes",
      year: "2023",
      edition: "39th",
      category: "Review",
      rating: 4.7,
      coverUrl: "https://m.media-amazon.com/images/I/4181TXSBE9L._SX218_BO1,204,203,200_QL40_FMwebp_.jpg",
      description: "Comprehensive medical review text revised by clinical staff and students.",
      recommended: true
    }
  ],
  'Australian Medical Program': [
    {
      id: 'talley-clinical',
      title: "Clinical Examination: A Systematic Guide",
      author: "Nicholas J. Talley, Simon O'Connor",
      publisher: "Elsevier",
      year: "2020",
      edition: "8th",
      category: "Clinical Skills",
      rating: 4.6,
      coverUrl: "https://m.media-amazon.com/images/I/41iR-1cYnVL._SX218_BO1,204,203,200_QL40_FMwebp_.jpg",
      description: "A guide to taking an accurate medical history and conducting physical examinations.",
      recommended: true
    }
  ]
};

const BookReferencePage = () => {
  const { studyPlan, loading } = useStudyContext();
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [bookmarkedBooks, setBookmarkedBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const navigate = useNavigate();
  
  // Categories for filtering
  const categories = ['All', 'Anatomy', 'Pathology', 'Internal Medicine', 'Clinical Medicine', 'USMLE', 'Review'];
  
  // Load bookmarked books from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bookmarkedBooks');
      if (saved) {
        setBookmarkedBooks(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Error loading bookmarked books:', err);
    }
    
    // Initialize filtered books
    setFilteredBooks(booksByProgram[studyPlan] || []);
  }, [studyPlan]);
  
  // Filter books based on selected tab and search term
  useEffect(() => {
    let books = booksByProgram[studyPlan] || [];
    
    // Apply category filter
    if (activeTab > 0 && categories[activeTab] !== 'All') {
      books = books.filter(book => book.category === categories[activeTab]);
    }
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      books = books.filter(book => 
        book.title.toLowerCase().includes(term) ||
        book.author.toLowerCase().includes(term) ||
        book.description.toLowerCase().includes(term) ||
        book.category.toLowerCase().includes(term)
      );
    }
    
    setFilteredBooks(books);
  }, [studyPlan, activeTab, searchTerm]);
  
  // Toggle book bookmark status
  const toggleBookmark = (bookId, event) => {
    if (event) {
      event.stopPropagation();
    }
    
    let newBookmarks;
    
    if (bookmarkedBooks.includes(bookId)) {
      newBookmarks = bookmarkedBooks.filter(id => id !== bookId);
    } else {
      newBookmarks = [...bookmarkedBooks, bookId];
    }
    
    setBookmarkedBooks(newBookmarks);
    localStorage.setItem('bookmarkedBooks', JSON.stringify(newBookmarks));
  };
  
  // Find book by ID across all syllabi
  const findBookById = (bookId) => {
    for (const program in booksByProgram) {
      const book = booksByProgram[program].find(b => b.id === bookId);
      if (book) return book;
    }
    return null;
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Handle book selection
  const handleBookSelect = (book) => {
    setSelectedBook(book);
  };
  
  // Back to book list
  const handleBackToList = () => {
    setSelectedBook(null);
  };

  return (
    <Container maxWidth="lg">
      <Card sx={{ 
        borderRadius: 3, 
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
        mb: 4,
        overflow: 'visible'
      }}>
        <CardContent sx={{ pt: 3, pb: 3 }}>
          <Typography variant="h5" component="h1" fontWeight="600" color="primary" gutterBottom>
            Medical Textbook References
          </Typography>
          
          {loading && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Loading...
            </Alert>
          )}
          
          {selectedBook ? (
            <Box>
              <Button 
                startIcon={<ArrowBackIcon />} 
                onClick={handleBackToList}
                sx={{ mb: 2 }}
              >
                Back to book list
              </Button>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Box 
                    component="img" 
                    src={selectedBook.coverUrl} 
                    alt={selectedBook.title}
                    sx={{ 
                      width: '100%', 
                      maxWidth: 300, 
                      display: 'block', 
                      mx: 'auto',
                      boxShadow: 3,
                      borderRadius: 2
                    }} 
                  />
                </Grid>
                <Grid item xs={12} md={8}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="h4" component="h2" gutterBottom>
                      {selectedBook.title}
                    </Typography>
                    
                    <IconButton 
                      onClick={(e) => toggleBookmark(selectedBook.id, e)}
                      color="primary"
                    >
                      {bookmarkedBooks.includes(selectedBook.id) ? 
                        <BookmarkIcon /> : 
                        <BookmarkBorderIcon />}
                    </IconButton>
                  </Box>
                  
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    {selectedBook.author}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Rating value={selectedBook.rating} readOnly precision={0.1} />
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      {selectedBook.rating}/5
                    </Typography>
                    
                    <Chip 
                      label={selectedBook.category} 
                      color="primary" 
                      size="small" 
                      sx={{ ml: 2 }} 
                    />
                    
                    {selectedBook.recommended && (
                      <Chip 
                        label="Highly Recommended" 
                        color="secondary" 
                        size="small" 
                        sx={{ ml: 1 }} 
                      />
                    )}
                  </Box>
                  
                  <Typography variant="body1" paragraph sx={{ mb: 3 }}>
                    {selectedBook.description}
                  </Typography>
                  
                  <Paper sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 2, mb: 3 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6} md={3}>
                        <Typography variant="subtitle2" color="text.secondary">Edition</Typography>
                        <Typography variant="body1">{selectedBook.edition}</Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="subtitle2" color="text.secondary">Year</Typography>
                        <Typography variant="body1">{selectedBook.year}</Typography>
                      </Grid>
                      <Grid item xs={6} md={6}>
                        <Typography variant="subtitle2" color="text.secondary">Publisher</Typography>
                        <Typography variant="body1">{selectedBook.publisher}</Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                  
                  <Button 
                    variant="contained" 
                    color="primary"
                    endIcon={<OpenInNewIcon />}
                    onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(selectedBook.title + ' ' + selectedBook.author)}`, '_blank')}
                    sx={{ mr: 2 }}
                  >
                    Find Online
                  </Button>
                  
                  <Button 
                    variant="outlined"
                    onClick={(e) => toggleBookmark(selectedBook.id, e)}
                    startIcon={bookmarkedBooks.includes(selectedBook.id) ? 
                      <BookmarkIcon /> : 
                      <BookmarkBorderIcon />}
                  >
                    {bookmarkedBooks.includes(selectedBook.id) ? 'Remove Bookmark' : 'Bookmark'}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          ) : (
            <>
              <Box sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  placeholder="Search books by title, author, or category..."
                  variant="outlined"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3
                    }
                  }}
                />
              </Box>
              
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs 
                  value={activeTab} 
                  onChange={handleTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  {categories.map((category, index) => (
                    <Tab label={category} key={index} />
                  ))}
                </Tabs>
              </Box>
              
              {filteredBooks.length > 0 ? (
                <Grid container spacing={3}>
                  {filteredBooks.map((book) => (
                    <Grid item xs={12} sm={6} md={4} key={book.id}>
                      <Card 
                        sx={{ 
                          height: '100%', 
                          display: 'flex', 
                          flexDirection: 'column',
                          transition: 'all 0.2s',
                          '&:hover': { 
                            transform: 'translateY(-4px)',
                            boxShadow: 4
                          },
                          cursor: 'pointer'
                        }}
                        onClick={() => handleBookSelect(book)}
                      >
                        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Typography variant="h6" component="h3" gutterBottom>
                            {book.title}
                          </Typography>
                          
                          <IconButton 
                            onClick={(e) => toggleBookmark(book.id, e)}
                            color="primary"
                            size="small"
                          >
                            {bookmarkedBooks.includes(book.id) ? 
                              <BookmarkIcon /> : 
                              <BookmarkBorderIcon />}
                          </IconButton>
                        </Box>
                        
                        <CardMedia
                          component="img"
                          sx={{ width: '40%', margin: '0 auto', objectFit: 'contain', py: 2 }}
                          image={book.coverUrl}
                          alt={book.title}
                        />
                        
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                            {book.author}
                          </Typography>
                          
                          <Typography variant="body2" sx={{ mb: 2, height: 60, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {book.description}
                          </Typography>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Rating value={book.rating} readOnly precision={0.1} size="small" />
                            <Typography variant="body2" sx={{ ml: 1 }}>
                              {book.rating}/5
                            </Typography>
                          </Box>
                          
                          <Divider sx={{ my: 1 }} />
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Chip 
                              label={book.category} 
                              size="small" 
                              variant="outlined"
                            />
                            
                            {book.recommended && (
                              <Chip 
                                label="Recommended" 
                                color="primary" 
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No books found matching your criteria
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Try adjusting your search or selecting a different category
                  </Typography>
                </Paper>
              )}
            </>
          )}
        </CardContent>
      </Card>
      
      {bookmarkedBooks.length > 0 && !selectedBook && (
        <Card sx={{ 
          borderRadius: 3, 
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
          mb: 4 
        }}>
          <CardContent>
            <Typography variant="h5" component="h2" gutterBottom fontWeight="600">
              Your Bookmarked Books
            </Typography>
            
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={2}>
              {bookmarkedBooks.map(bookId => {
                const book = findBookById(bookId);
                if (!book) return null;
                
                return (
                  <Grid item xs={12} sm={6} md={3} key={bookId}>
                    <Card 
                      sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        height: '100%',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': { 
                          transform: 'translateY(-4px)',
                          boxShadow: 3
                        }
                      }}
                      onClick={() => handleBookSelect(book)}
                    >
                      <CardMedia
                        component="img"
                        sx={{ height: 160, objectFit: 'contain', p: 2 }}
                        image={book.coverUrl}
                        alt={book.title}
                      />
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" component="h3" gutterBottom noWrap>
                          {book.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {book.author}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                          <Rating value={book.rating} readOnly size="small" />
                          <Chip 
                            label={book.category} 
                            size="small" 
                            sx={{ ml: 1 }} 
                            variant="outlined"
                          />
                        </Box>
                      </CardContent>
                      <Box sx={{ p: 1, display: 'flex', justifyContent: 'flex-end' }}>
                        <IconButton 
                          size="small" 
                          onClick={(e) => toggleBookmark(bookId, e)}
                          color="primary"
                        >
                          <BookmarkIcon />
                        </IconButton>
                      </Box>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default BookReferencePage;