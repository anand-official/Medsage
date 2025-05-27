// src/pages/HomePage.js
import React, { useContext } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Container,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { StudyContext } from '../contexts/StudyContext';
import { usePageAnimation } from '../hooks/usePageAnimation';
import HeroSection from '../components/home/HeroSection';
import QuickActions from '../components/home/QuickActions';
import ProgressCard from '../components/home/ProgressCard';
import RecentActivity from '../components/home/RecentActivity';

const HomePage = () => {
  const { 
    currentSyllabus, 
    examDate, 
    studyProgress, 
    recentQueries, 
    isOfflineMode 
  } = useContext(StudyContext);
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  usePageAnimation();
  
  // Motion variants
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
          {/* Hero Section with Gradient Background */}
          <Box sx={{ 
            position: 'relative',
            mb: 6,
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
            <HeroSection />
          </Box>

          {/* Study Progress Section */}
          <Box sx={{ mb: 6 }}>
        <motion.div variants={itemVariants}>
              <ProgressCard />
        </motion.div>
      </Box>
      
          {/* Quick Actions Section */}
          <Box sx={{ mb: 6 }}>
            <QuickActions />
                  </Box>
      
          {/* Recent Activity Section */}
          <Grid container spacing={3}>
            <Grid item xs={12}>
          <motion.div variants={itemVariants}>
                <RecentActivity />
          </motion.div>
        </Grid>
      </Grid>
        </Container>
      </Box>
    </motion.div>
  );
};

export default HomePage;