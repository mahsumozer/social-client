import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, IconButton, CircularProgress, Alert } from '@mui/material';
import { NavigateBefore as NavigateBeforeIcon, NavigateNext as NavigateNextIcon } from '@mui/icons-material';
import { auth, profiles } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface UserProfileProps {
  userId: string;
  onMessageClick?: (userId: string) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ userId, onMessageClick }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        // Mevcut kullanıcıyı al
        const userResponse = await auth.getUser();
        setCurrentUserId(userResponse.data.user?.id || null);

        // Profil bilgilerini al
        const { data: userProfile, error: profileError } = await profiles.getProfile(userId);
        if (profileError) throw profileError;
        if (!userProfile) throw new Error('Profil bulunamadı');
        setProfile(userProfile);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId]);

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveStep((prevStep) => (prevStep + 1) % (profile?.photos?.length || 1));
  };

  const handleBack = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveStep((prevStep) => (prevStep - 1 + (profile?.photos?.length || 1)) % (profile?.photos?.length || 1));
  };

  const handleMessageClick = () => {
    if (onMessageClick) {
      onMessageClick(userId);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const currentPhoto = profile?.photos?.[activeStep] || 'https://source.unsplash.com/random/400x400?portrait';
  const maxSteps = profile?.photos?.length || 1;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Fotoğraf Galerisi */}
      <Box sx={{ 
        position: 'relative',
        width: '100%',
        maxWidth: 600,
        margin: '0 auto',
        '&::before': {
          content: '""',
          display: 'block',
          paddingTop: '100%'
        }
      }}>
        <Box
          component="img"
          src={currentPhoto}
          alt={profile.name}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: 2
          }}
        />
        
        {/* Navigasyon Butonları */}
        {maxSteps > 1 && (
          <>
            <IconButton
              onClick={handleBack}
              sx={{
                position: 'absolute',
                left: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                bgcolor: 'rgba(0, 0, 0, 0.5)',
                color: 'white',
                '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' }
              }}
            >
              <NavigateBeforeIcon />
            </IconButton>
            <IconButton
              onClick={handleNext}
              sx={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                bgcolor: 'rgba(0, 0, 0, 0.5)',
                color: 'white',
                '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' }
              }}
            >
              <NavigateNextIcon />
            </IconButton>
          </>
        )}

        {/* Nokta Göstergeleri */}
        {maxSteps > 1 && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 8,
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              gap: 1
            }}
          >
            {[...Array(maxSteps)].map((_, index) => (
              <Box
                key={index}
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: index === activeStep ? 'primary.main' : 'rgba(255, 255, 255, 0.7)'
                }}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Profil Bilgileri */}
      <Box sx={{ 
        p: 2, 
        maxWidth: 600, 
        margin: '0 auto',
        width: '100%'
      }}>
        <Typography variant="h4" gutterBottom>
          {profile.name}, {profile.age}
        </Typography>
        {profile.bio && (
          <Typography variant="body1" color="text.secondary" paragraph>
            {profile.bio}
          </Typography>
        )}
        
        {/* Mesaj Butonu - Sadece kendi profilimiz değilse göster */}
        {currentUserId !== userId && (
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={handleMessageClick}
          >
            Mesaj Gönder
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default UserProfile; 