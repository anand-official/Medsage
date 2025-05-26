import React from 'react';
import { Box, Typography, Button, Paper, Container } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { Error as ErrorIcon } from '@mui/icons-material';


const NotFoundPage = () => {
  return (
    <Container maxWidth="md">
      <Paper
        sx={{
          py: 6,
          px: 4,
          mt: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}
      >
        <ErrorIcon sx={{ fontSize: 100, color: 'text.secondary', mb: 2 }} />
        
        <Typography variant="h3" component="h1" gutterBottom>
          404: Page Not Found
        </Typography>
        
        <Typography variant="h6" color="text.secondary" paragraph>
          The page you're looking for doesn't exist or has been moved.
        </Typography>
        
        <Box sx={{ mt: 2 }}>
          <Typography variant="body1" paragraph>
            Here are some helpful links instead:
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              component={RouterLink}
              to="/"
              size="large"
            >
              Go to Home Page
            </Button>
            
            <Button
              variant="outlined"
              component={RouterLink}
              to="/question"
              size="large"
            >
              Ask a Medical Question
            </Button>
            
            <Button
              variant="outlined"
              component={RouterLink}
              to="/planner"
              size="large"
            >
              Study Planner
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default NotFoundPage;
