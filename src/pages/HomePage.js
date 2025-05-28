// src/pages/HomePage.js
import React from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Container,
  Button,
  Card,
  CardContent,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { usePageAnimation } from '../hooks/usePageAnimation';

const HomePage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  usePageAnimation();
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.2
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

  const features = [
    {
      title: "AI-Powered Study Assistant",
      description: "Get instant answers to your medical questions with detailed explanations and references",
      action: () => navigate('/question')
    },
    {
      title: "Smart Study Planner",
      description: "Create personalized study plans based on your exam date and subjects",
      action: () => navigate('/planner')
    },
    {
      title: "Book References",
      description: "Access comprehensive medical textbook references and citations",
      action: () => navigate('/books')
    }
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Box sx={{ 
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${theme.palette.background.default} 0%, ${theme.palette.background.paper} 100%)`,
        pb: 8
      }}>
        <Container maxWidth="xl">
          {/* Hero Section */}
          <Box sx={{ 
            position: 'relative',
            mb: 8,
            pt: 8,
            pb: 6,
            textAlign: 'center',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '100%',
              background: `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.secondary.main}15 100%)`,
              borderRadius: '0 0 40px 40px',
              zIndex: 0
            }
          }}>
            <motion.div variants={itemVariants}>
              <Typography 
                variant="h2" 
                component="h1" 
                gutterBottom
                sx={{ 
                  fontWeight: 'bold',
                  color: theme.palette.primary.main,
                  mb: 2
                }}
              >
                Welcome to MedSage
              </Typography>
              <Typography 
                variant="h5" 
                color="text.secondary"
                sx={{ mb: 4, maxWidth: '800px', mx: 'auto' }}
              >
                Your AI-powered medical study companion. Get instant answers, create study plans, and access comprehensive medical references.
              </Typography>
              <Button 
                variant="contained" 
                size="large"
                onClick={() => navigate('/question')}
                sx={{ 
                  px: 4, 
                  py: 1.5,
                  fontSize: '1.1rem',
                  borderRadius: '30px'
                }}
              >
                Try It Now
              </Button>
            </motion.div>
          </Box>

          {/* Features Section */}
          <Grid container spacing={4} sx={{ mb: 8 }}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={4} key={index}>
                <motion.div variants={itemVariants}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: theme.shadows[8]
                      }
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1, textAlign: 'center', py: 4 }}>
                      <Typography variant="h5" component="h2" gutterBottom color="primary">
                        {feature.title}
                      </Typography>
                      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                        {feature.description}
                      </Typography>
                      <Button 
                        variant="outlined" 
                        onClick={feature.action}
                        sx={{ 
                          borderRadius: '20px',
                          px: 3
                        }}
                      >
                        Learn More
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>

          {/* Call to Action */}
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <motion.div variants={itemVariants}>
              <Typography variant="h4" gutterBottom color="primary">
                Ready to Transform Your Medical Studies?
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: '600px', mx: 'auto' }}>
                Join thousands of medical students who are already using MedSage to enhance their learning experience.
              </Typography>
              <Button 
                variant="contained" 
                size="large"
                onClick={() => navigate('/question')}
                sx={{ 
                  px: 6, 
                  py: 2,
                  fontSize: '1.2rem',
                  borderRadius: '30px'
                }}
              >
                Get Started
              </Button>
            </motion.div>
          </Box>
        </Container>
      </Box>
    </motion.div>
  );
};

export default HomePage;