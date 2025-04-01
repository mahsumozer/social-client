import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Paper,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { auth, profiles } from '../lib/supabase';
import LocationPicker from '../components/LocationPicker';

interface UserProfile {
  id: string;
  name: string;
  age: number;
  gender: string;
  bio: string;
  photos: string[];
  latitude?: number;
  longitude?: number;
}

const Settings = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user }, error: authError } = await auth.getUser();
        if (authError) throw authError;
        if (!user?.id) throw new Error('Kullanıcı bulunamadı');

        const { data: userProfile, error: profileError } = await profiles.getProfile(user.id);
        if (profileError) throw profileError;

        setProfile(userProfile);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleLocationSelect = async (location: { latitude: number; longitude: number }) => {
    if (!profile) return;

    try {
      const { error } = await profiles.updateProfile(profile.id, {
        ...profile,
        latitude: location.latitude,
        longitude: location.longitude
      });

      if (error) throw error;

      setProfile(prev => prev ? {
        ...prev,
        latitude: location.latitude,
        longitude: location.longitude
      } : null);

      setShowLocationPicker(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
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

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>Profil Ayarları</Typography>
        
        {/* Mevcut ayarlar */}
        
        {/* Konum seçici */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>Konum</Typography>
          <Button
            variant="outlined"
            onClick={() => setShowLocationPicker(true)}
            sx={{ mt: 1 }}
          >
            {profile?.latitude && profile?.longitude
              ? 'Konumu Güncelle'
              : 'Konum Seç'}
          </Button>
          {profile?.latitude && profile?.longitude && (
            <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
              Mevcut konum: {profile.latitude.toFixed(4)}, {profile.longitude.toFixed(4)}
            </Typography>
          )}
        </Box>

        {/* Konum seçici dialog */}
        <Dialog
          open={showLocationPicker}
          onClose={() => setShowLocationPicker(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Konum Seç</DialogTitle>
          <DialogContent>
            <LocationPicker
              onLocationSelect={handleLocationSelect}
              initialLocation={
                profile?.latitude && profile?.longitude
                  ? { latitude: profile.latitude, longitude: profile.longitude }
                  : undefined
              }
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowLocationPicker(false)}>İptal</Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
};

export default Settings; 