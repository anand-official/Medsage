import React, { useContext } from 'react';
import { Box, Typography, Button, Chip, useTheme, useMediaQuery } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useStudyContext } from '../../contexts/StudyContext';
import { format, differenceInDays } from 'date-fns';
import { 
  School as SchoolIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingIcon
} from '@mui/icons-material';

const HeroSection = () => {
  const { studyPlan, loading } = useStudyContext();
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const daysRemaining = studyPlan?.examDate 
    ? differenceInDays(new Date(studyPlan.examDate), new Date())
    : 0;
  const formattedExamDate = studyPlan?.examDate 
    ? format(new Date(studyPlan.examDate), 'MMMM dd, yyyy')
    : 'Not set';

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
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

  if (loading) {
    return (
      <Box sx={{ 
        position: 'relative',
        py: { xs: 4, md: 6 },
        px: { xs: 2, md: 4 },
        textAlign: 'center',
        zIndex: 1
      }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Box sx={{ 
        position: 'relative',
        py: { xs: 4, md: 6 },
        px: { xs: 2, md: 4 },
        textAlign: 'center',
        zIndex: 1
      }}>
        <motion.div variants={itemVariants}>
          <Typography 
            variant="h2" 
            component="h1" 
            gutterBottom
            sx={{ 
              fontWeight: 800,
              fontSize: { xs: '2.5rem', sm: '3rem', md: '4rem' },
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0px 2px 4px rgba(0,0,0,0.1)',
              mb: 2
            }}
          >
            Your Medical Study Journey
          </Typography>
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <Typography 
            variant="h5" 
            color="text.secondary" 
            sx={{ 
              fontWeight: 400,
              mb: 4,
              maxWidth: '800px',
              mx: 'auto',
              lineHeight: 1.6
            }}
          >
            Personalized learning experience powered by AI to help you master medical concepts and excel in your studies
          </Typography>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Box sx={{ 
            display: 'flex', 
            gap: 2, 
            justifyContent: 'center',
            flexWrap: 'wrap',
            mb: 4
          }}>
            <Chip
              icon={<SchoolIcon />}
              label={`${studyPlan?.completionPercentage || 0}% Complete`}
              sx={{
                bgcolor: `${theme.palette.primary.main}15`,
                color: theme.palette.primary.main,
                fontWeight: 500,
                px: 2,
                py: 3,
                '& .MuiChip-icon': {
                  color: theme.palette.primary.main
                }
              }}
            />
            <Chip
              icon={<CalendarIcon />}
              label={`${daysRemaining} Days to Exam`}
              sx={{
                bgcolor: `${theme.palette.secondary.main}15`,
                color: theme.palette.secondary.main,
                fontWeight: 500,
                px: 2,
                py: 3,
                '& .MuiChip-icon': {
                  color: theme.palette.secondary.main
                }
              }}
            />
            <Chip
              icon={<TrendingIcon />}
              label={`${studyPlan?.completedTopics || 0} Topics Mastered`}
              sx={{
                bgcolor: `${theme.palette.success.main}15`,
                color: theme.palette.success.main,
                fontWeight: 500,
                px: 2,
                py: 3,
                '& .MuiChip-icon': {
                  color: theme.palette.success.main
                }
              }}
            />
          </Box>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Box sx={{ 
            display: 'flex', 
            gap: 2, 
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/question')}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 3,
                fontSize: '1.1rem',
                fontWeight: 600,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                boxShadow: `0 4px 14px ${theme.palette.primary.main}40`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                  boxShadow: `0 6px 20px ${theme.palette.primary.main}60`,
                }
              }}
            >
              Ask a Question
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/planner')}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 3,
                fontSize: '1.1rem',
                fontWeight: 600,
                borderWidth: 2,
                '&:hover': {
                  borderWidth: 2,
                  background: `${theme.palette.primary.main}10`
                }
              }}
            >
              Create Study Plan
            </Button>
          </Box>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ 
              mt: 4,
              opacity: 0.8
            }}
          >
            Next exam on {formattedExamDate}
          </Typography>
        </motion.div>
      </Box>
    </motion.div>
  );
};

export default HeroSection; 