import React, { useState, useEffect } from 'react';
import { Container, Paper, Typography, TextField, Button, Box, Avatar, Alert, CircularProgress, FormControl, InputLabel, Select, MenuItem, IconButton, Card, CardMedia, CardActions } from '@mui/material';
import Grid from '@mui/material/Grid';
import { auth, profiles, storage, supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import DeleteIcon from '@mui/icons-material/Delete';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';

interface ProfileData {
  id: string;
  name: string;
  age: number;
  bio: string;
  photos: string[];
  gender: string;
}

const DEFAULT_PHOTO = 'https://source.unsplash.com/random/400x400?portrait';

const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<ProfileData>({
    id: '',
    name: '',
    age: 18,
    bio: '',
    photos: [],
    gender: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user }, error: authError } = await auth.getUser();
        if (authError) throw authError;

        if (!user) {
          navigate('/login');
          return;
        }

        const { data: profileData, error: profileError } = await profiles.getProfile(user.id);
        if (profileError) throw profileError;

        if (profileData) {
          const safeProfileData = {
            ...profileData,
            photos: profileData.photos || []
          };
          setProfile(safeProfileData);
          const isComplete = await profiles.isProfileComplete(user.id);
          setIsProfileIncomplete(!isComplete);
        }
      } catch (error: any) {
        setError(error.message || 'Profil yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'number' ? parseInt(e.target.value) : e.target.value;
    setProfile({
      ...profile,
      [e.target.name]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setUpdating(true);

    try {
      const { data: { user }, error: authError } = await auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('Kullanıcı bulunamadı');

      const { error: updateError } = await profiles.updateProfile(user.id, profile);
      if (updateError) throw updateError;

      setSuccess('Profiliniz başarıyla güncellendi');
      setIsProfileIncomplete(false);

      // Eğer başka bir sayfadan yönlendirildiyse, o sayfaya geri dön
      const from = location.state?.from?.pathname || '/';
      navigate(from);
    } catch (error: any) {
      setError(error.message || 'Profil güncellenirken bir hata oluştu');
    } finally {
      setUpdating(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setError('Dosya boyutu 5MB\'dan küçük olmalıdır');
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      setLoading(true);

      const { publicUrl, error: uploadError } = await storage.uploadProfilePhoto(profile.id, file);
      
      if (uploadError) throw uploadError;
      if (!publicUrl) throw new Error('Fotoğraf yüklenemedi');

      setProfile(prev => ({
        ...prev,
        photos: [...(prev.photos || []), publicUrl]
      }));
      
      setSuccess('Fotoğraf başarıyla yüklendi');
      
      // Input'u temizle
      e.target.value = '';
    } catch (error: any) {
      console.error('Fotoğraf yükleme hatası:', error);
      setError(error.message || 'Fotoğraf yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoDelete = async (photoUrl: string) => {
    try {
      setError(null);
      setSuccess(null);
      setLoading(true);
      
      await storage.deleteProfilePhoto(profile.id, photoUrl);
      
      setProfile(prev => ({
        ...prev,
        photos: prev.photos.filter(url => url !== photoUrl)
      }));
      
      setSuccess('Fotoğraf başarıyla silindi');
    } catch (error: any) {
      console.error('Fotoğraf silme hatası:', error);
      setError(error.message || 'Fotoğraf silinirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {isProfileIncomplete && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Lütfen profil bilgilerinizi tamamlayın. Uygulamayı kullanabilmek için bu zorunludur.
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" gutterBottom>
            Profil Bilgileri
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Ad Soyad"
              name="name"
              value={profile.name}
              onChange={handleChange}
              margin="normal"
              required
              disabled={updating}
              error={isProfileIncomplete && !profile.name}
            />
            <TextField
              fullWidth
              label="Yaş"
              name="age"
              type="number"
              value={profile.age}
              onChange={handleChange}
              margin="normal"
              required
              disabled={updating}
              error={isProfileIncomplete && !profile.age}
            />
            <FormControl fullWidth margin="normal" error={isProfileIncomplete && !profile.gender}>
              <InputLabel>Cinsiyet</InputLabel>
              <Select
                value={profile.gender}
                label="Cinsiyet"
                name="gender"
                onChange={handleChange as any}
                required
                disabled={updating}
              >
                <MenuItem value="male">Erkek</MenuItem>
                <MenuItem value="female">Kadın</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Hakkımda"
              name="bio"
              multiline
              rows={4}
              value={profile.bio}
              onChange={handleChange}
              margin="normal"
              required
              disabled={updating}
              error={isProfileIncomplete && !profile.bio}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{ mt: 2 }}
              disabled={updating}
            >
              {updating ? 'Güncelleniyor...' : 'Profili Güncelle'}
            </Button>
          </Box>
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" gutterBottom>
            Fotoğraflar
          </Typography>

          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            id="photo-upload"
            onChange={handlePhotoUpload}
          />
          
          <label htmlFor="photo-upload">
            <Button
              component="span"
              variant="outlined"
              fullWidth
              startIcon={<AddPhotoAlternateIcon />}
              sx={{ mb: 2 }}
              disabled={loading || profile.photos.length >= 6}
            >
              Fotoğraf Yükle
            </Button>
          </label>

          {profile.photos.length === 0 ? (
            <Alert severity="info">
              Henüz fotoğraf yüklemediniz. En az bir fotoğraf yüklemeniz önerilir.
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {profile.photos.map((photo, index) => (
                <Box key={index} sx={{ width: 'calc(50% - 8px)' }}>
                  <Card>
                    <CardMedia
                      component="img"
                      height="200"
                      image={photo}
                      alt={`Profil fotoğrafı ${index + 1}`}
                    />
                    <CardActions sx={{ justifyContent: 'flex-end' }}>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handlePhotoDelete(photo)}
                        disabled={loading}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </CardActions>
                  </Card>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </Container>
  );
};

export default Profile; 