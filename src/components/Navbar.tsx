import React, { useEffect, useState } from 'react';
import { AppBar, Toolbar, Typography, Button, IconButton, Box } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PersonIcon from '@mui/icons-material/Person';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import { auth, supabase } from '../lib/supabase';

const Navbar = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await auth.getUser();
      setIsAuthenticated(!!user);
    };

    checkAuth();

    // Auth durumu değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    setIsAuthenticated(false);
    navigate('/login');
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography 
          variant="h6" 
          component={RouterLink} 
          to="/" 
          sx={{ 
            flexGrow: 1, 
            textDecoration: 'none', 
            color: 'inherit' 
          }}
        >
          Tinder Klonu
        </Typography>

        {isAuthenticated ? (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton 
              color="inherit" 
              component={RouterLink} 
              to="/find-friends"
              sx={{ mr: 1 }}
            >
              <PeopleIcon />
            </IconButton>
            <IconButton 
              color="inherit" 
              component={RouterLink} 
              to="/matches"
              sx={{ mr: 1 }}
            >
              <FavoriteIcon />
            </IconButton>
            <IconButton 
              color="inherit" 
              component={RouterLink} 
              to="/profile"
              sx={{ mr: 1 }}
            >
              <PersonIcon />
            </IconButton>
            <IconButton 
              color="inherit" 
              component={RouterLink} 
              to="/settings"
              sx={{ mr: 2 }}
            >
              <SettingsIcon />
            </IconButton>
            <Button 
              color="inherit" 
              onClick={handleLogout}
              variant="outlined"
              sx={{ borderColor: 'white' }}
            >
              Çıkış Yap
            </Button>
          </Box>
        ) : (
          <Box>
            <Button 
              color="inherit" 
              component={RouterLink} 
              to="/login"
              sx={{ mr: 1 }}
            >
              Giriş Yap
            </Button>
            <Button 
              color="inherit" 
              component={RouterLink} 
              to="/register"
              variant="outlined"
              sx={{ borderColor: 'white' }}
            >
              Kayıt Ol
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar; 