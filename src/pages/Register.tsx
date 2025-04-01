import React, { useState } from 'react';
import { Container, Paper, TextField, Button, Typography, Box, Alert, MenuItem } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { auth, profiles } from '../lib/supabase';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: '',
    gender: '',
    bio: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError('Şifreler eşleşmiyor');
      setLoading(false);
      return;
    }

    try {
      // Kullanıcı kaydı
      const { data: authData, error: authError } = await auth.signUp(
        formData.email,
        formData.password
      );

      if (authError) throw authError;

      if (authData.user) {
        // Profil oluşturma
        const { error: profileError } = await profiles.updateProfile(authData.user.id, {
          name: formData.name,
          age: parseInt(formData.age),
          gender: formData.gender,
          bio: formData.bio
        });

        if (profileError) throw profileError;

        setSuccess('Kayıt başarılı! Lütfen e-posta adresinize gönderilen doğrulama bağlantısına tıklayın.');
        // navigate('/'); // Şimdilik yönlendirmeyi kaldırıyoruz
      }
    } catch (error: any) {
      setError(error.message || 'Kayıt olurken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Kayıt Ol
        </Typography>
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
        <Box component="form" onSubmit={handleSubmit}>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <Box sx={{ gridColumn: { xs: '1', sm: 'span 2' } }}>
              <TextField
                fullWidth
                label="Ad Soyad"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </Box>
            <Box sx={{ gridColumn: { xs: '1', sm: 'span 2' } }}>
              <TextField
                fullWidth
                label="E-posta"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                label="Şifre"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                label="Şifre Tekrar"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                label="Yaş"
                name="age"
                type="number"
                value={formData.age}
                onChange={handleChange}
                required
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                label="Cinsiyet"
                name="gender"
                select
                value={formData.gender}
                onChange={handleChange}
                required
              >
                <MenuItem value="male">Erkek</MenuItem>
                <MenuItem value="female">Kadın</MenuItem>
              </TextField>
            </Box>
            <Box sx={{ gridColumn: { xs: '1', sm: 'span 2' } }}>
              <TextField
                fullWidth
                label="Hakkımda"
                name="bio"
                multiline
                rows={4}
                value={formData.bio}
                onChange={handleChange}
              />
            </Box>
            <Box sx={{ gridColumn: { xs: '1', sm: 'span 2' } }}>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                disabled={loading}
              >
                {loading ? "Kaydediliyor..." : "Kayıt Ol"}
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default Register; 