import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { motion } from 'framer-motion';

const Header = () => {
  const theme = useTheme();

  // Animation variants
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
    hidden: { y: -20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  const underlineVariants = {
    hidden: { width: "0%" },
    visible: { 
      width: "100%", 
      transition: { 
        duration: 0.8,
        delay: 0.5,
        ease: "easeInOut"
      }
    }
  };

  const pulseVariants = {
    pulse: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        repeatType: "reverse"
      }
    }
  };

  return (
    <Box 
      component={motion.div}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      sx={{ 
        mb: 6, 
        mt: 4,
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        padding: '2rem 1rem',
        borderRadius: theme.shape.borderRadius,
        background: `linear-gradient(135deg, ${theme.palette.primary.light}15, ${theme.palette.secondary.light}15)`,
      }}
    >
      {/* Background elements */}
      <Box 
        component={motion.div}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.06 }}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%231976d2\' fill-opacity=\'0.2\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }}
      />

      {/* Main title */}
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Typography 
          component={motion.h1}
          variants={itemVariants}
          sx={{ 
            fontWeight: 700, 
            fontSize: { xs: '2.5rem', md: '3.5rem' },
            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'inline-block',
            mb: 1
          }}
        >
          Medsage
        </Typography>

        {/* Animated underline */}
        <Box 
          component={motion.div} 
          variants={underlineVariants}
          sx={{ 
            height: '4px', 
            width: '100%', 
            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            borderRadius: '2px',
            mx: 'auto',
            mb: 3,
            maxWidth: '180px'
          }}
        />

        {/* Subtitle */}
        <Typography 
          component={motion.h2}
          variants={itemVariants}
          variant="h6" 
          color="text.secondary" 
          gutterBottom
          sx={{ fontWeight: 400 }}
        >
          Your AI-powered medical learning assistant
        </Typography>

        {/* Animated icon or badge */}
        <Box 
          component={motion.div}
          variants={pulseVariants}
          animate="pulse"
          sx={{ 
            display: 'inline-block', 
            mt: 2,
            p: 1,
            borderRadius: '50%',
            background: theme.palette.mode === 'light' ? 'rgba(255,255,255,0.8)' : 'rgba(30,30,30,0.8)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
        >
          <Box 
            component="svg"
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            sx={{ fill: theme.palette.primary.main }}
          >
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Header;
