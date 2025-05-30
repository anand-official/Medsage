import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button, Container, Typography, Box, Alert, CircularProgress } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useNavigate } from 'react-router-dom';

export default function SignIn() {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setLoading(true);
      console.log('Starting Google sign in...');
      const result = await signInWithGoogle();
      console.log('Sign in successful:', result);
      navigate('/'); // Redirect to home page after successful sign-in
    } catch (error) {
      console.error('Error signing in with Google:', error);
      setError(error.message || 'Failed to sign in with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
          Sign in to MedSage
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
            {error}
          </Alert>
        )}

        <Button
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
          onClick={handleGoogleSignIn}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <GoogleIcon />}
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </Button>
      </Box>
    </Container>
  );
} 