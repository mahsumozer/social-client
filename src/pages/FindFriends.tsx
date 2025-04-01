import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Alert,
  CircularProgress,
  SelectChangeEvent,
  IconButton,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Badge,
  Switch,
  FormControlLabel
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import MessageIcon from '@mui/icons-material/Message';
import PeopleIcon from '@mui/icons-material/People';
import { auth, profiles, matches, messages } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Matches from './Matches';
import UserProfile from './UserProfile';
import Messages from './Messages';

interface FilterOptions {
  minAge: number;
  maxAge: number;
  gender: string;
  useLocation: boolean;
  distance: number;
}

interface UserProfile {
  id: string;
  name: string;
  age: number;
  gender: string;
  bio: string;
  photos: string[] | null;
  distance?: number;
}

const DEFAULT_PHOTO = 'https://source.unsplash.com/random/400x400?portrait';

const DRAWER_WIDTH = 240;

type ContentView = 'matches' | 'find-friends' | 'settings' | 'profile' | 'messages';

const FindFriends = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filters, setFilters] = useState<FilterOptions>({
    minAge: 18,
    maxAge: 50,
    gender: 'all',
    useLocation: false,
    distance: 50
  });
  const [matchAlert, setMatchAlert] = useState(false);
  const [showPreferences, setShowPreferences] = useState(true);
  const [currentView, setCurrentView] = useState<ContentView>('find-friends');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [hasNewMatch, setHasNewMatch] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  const handleAgeChange = (event: Event, newValue: number | number[]) => {
    if (Array.isArray(newValue)) {
      setFilters(prev => ({
        ...prev,
        minAge: newValue[0],
        maxAge: newValue[1]
      }));
    }
  };

  const handleGenderChange = (event: SelectChangeEvent) => {
    setFilters(prev => ({
      ...prev,
      gender: event.target.value
    }));
  };

  const handleDistanceChange = (event: Event, newValue: number | number[]) => {
    if (!Array.isArray(newValue)) {
      setFilters(prev => ({
        ...prev,
        distance: newValue
      }));
    }
  };

  const handleLocationToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({
      ...prev,
      useLocation: event.target.checked
    }));
  };

  const handleLike = async () => {
    if (!users[currentIndex]) return;
    
    try {
      const { data: { user }, error: authError } = await auth.getUser();
      if (authError) throw authError;
      if (!user) return;

      const likedUserId = users[currentIndex].id;
      const { error: likeError } = await matches.createLike(user.id, likedUserId);
      
      if (likeError && !likeError.message.includes('unique constraint')) {
        throw likeError;
      }

      const isMatch = await matches.checkMatch(user.id, likedUserId);
      if (isMatch) {
        setMatchAlert(true);
      }

      setCurrentIndex(prev => prev + 1);
    } catch (error: any) {
      setError(error.message || 'Beğeni eklenirken bir hata oluştu');
    }
  };

  const handleDislike = () => {
    setCurrentIndex(prev => prev + 1);
  };

  const handleSwipe = async (direction: number) => {
    if (direction > 0) {
      await handleLike();
    } else {
      handleDislike();
    }
  };

  const searchUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user }, error: authError } = await auth.getUser();
      if (authError) throw authError;
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: profileData, error: profileError } = await profiles.getProfile(user.id);
      if (profileError) throw profileError;

      let userData;

      if (filters.useLocation && profileData?.latitude && profileData?.longitude) {
        const { data, error: searchError } = await profiles.searchNearbyUsers({
          userId: user.id,
          latitude: profileData.latitude,
          longitude: profileData.longitude,
          distance: filters.distance,
          minAge: filters.minAge,
          maxAge: filters.maxAge,
          gender: filters.gender
        });

        if (searchError) throw searchError;
        userData = data;
      } else {
        const { data, error: searchError } = await profiles.searchUsers({
          userId: user.id,
          minAge: filters.minAge,
          maxAge: filters.maxAge,
          gender: filters.gender
        });

        if (searchError) throw searchError;
        userData = data;
      }
      
      if (userData && userData.length > 0) {
        setUsers(userData);
        setCurrentIndex(0);
        setShowPreferences(false);
      } else {
        setError('Kriterlere uygun kullanıcı bulunamadı');
      }
    } catch (error: any) {
      setError(error.message || 'Kullanıcılar aranırken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentView === 'find-friends' && !showPreferences) {
      setShowPreferences(true);
    }
  }, [currentView]);

  useEffect(() => {
    const checkNewMatches = async () => {
      try {
        const { data: { user }, error: authError } = await auth.getUser();
        if (authError || !user) return;

        const { data: matchesData, error: matchesError } = await matches.getMatches(user.id);
        if (matchesError) throw matchesError;

        const hasRecentMatch = matchesData?.some(match => {
          const matchDate = new Date(match.created_at);
          const now = new Date();
          const hoursDiff = (now.getTime() - matchDate.getTime()) / (1000 * 60 * 60);
          return hoursDiff <= 24;
        });

        setHasNewMatch(hasRecentMatch || false);
      } catch (error) {
        console.error('Eşleşmeler kontrol edilirken hata:', error);
      }
    };

    checkNewMatches();
  }, []);

  useEffect(() => {
    if (matchAlert) {
      setHasNewMatch(true);
    }
  }, [matchAlert]);

  useEffect(() => {
    const checkUnreadMessages = async () => {
      try {
        const { data: { user }, error: authError } = await auth.getUser();
        if (authError || !user) return;

        const { data: unreadCount, error: unreadError } = await messages.getUnreadMessagesCount(user.id);
        if (unreadError) throw unreadError;

        setHasUnreadMessages(unreadCount > 0);
      } catch (error) {
        console.error('Okunmamış mesajlar kontrol edilirken hata:', error);
      }
    };

    checkUnreadMessages();
  }, []);

  useEffect(() => {
    const checkLocationData = async () => {
      if (filters.useLocation) {
        try {
          const { data: { user }, error: authError } = await auth.getUser();
          if (authError || !user) return;
  
          const { data: profileData } = await profiles.getProfile(user.id);
          if (!profileData?.latitude || !profileData?.longitude) {
            setError('Konum bilginiz eksik. Ayarlar sayfasından konum ekleyebilirsiniz.');
          }
        } catch (error) {
          console.error('Konum kontrolü hatası:', error);
        }
      }
    };

    checkLocationData();
  }, [filters.useLocation]);

  const currentUser = users[currentIndex];

  const handleProfileClick = (userId: string) => {
    setSelectedUserId(userId);
    setCurrentView('profile');
  };

  const handleMessageClick = (userId: string) => {
    setSelectedUserId(userId);
    setCurrentView('messages');
  };

  const handleMatchesClick = () => {
    setCurrentView('matches');
    setHasNewMatch(false);
  };

  const handleUnreadMessagesChange = (hasUnread: boolean) => {
    setHasUnreadMessages(hasUnread);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'matches':
        return <Matches 
          onProfileClick={handleProfileClick} 
          onMessageClick={handleMessageClick}
          onMatchesViewed={() => setHasNewMatch(false)}
        />;
      case 'profile':
        return selectedUserId ? 
          <UserProfile 
            userId={selectedUserId} 
            onMessageClick={handleMessageClick} 
          /> : null;
      case 'settings':
        return <div>Ayarlar</div>;
      case 'messages':
        return <Messages 
          selectedUserId={selectedUserId} 
          onUnreadMessagesChange={handleUnreadMessagesChange}
        />;
      case 'find-friends':
        return showPreferences ? (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Arama Tercihleri
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Typography gutterBottom>Yaş Aralığı: {filters.minAge} - {filters.maxAge}</Typography>
              <Slider
                value={[filters.minAge, filters.maxAge]}
                onChange={handleAgeChange}
                min={18}
                max={99}
                valueLabelDisplay="auto"
              />
            </Box>

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Cinsiyet</InputLabel>
              <Select
                value={filters.gender}
                onChange={handleGenderChange}
                label="Cinsiyet"
              >
                <MenuItem value="all">Tümü</MenuItem>
                <MenuItem value="male">Erkek</MenuItem>
                <MenuItem value="female">Kadın</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={filters.useLocation}
                  onChange={handleLocationToggle}
                  color="primary"
                />
              }
              label="Konuma göre ara"
              sx={{ mb: 2 }}
            />

            {filters.useLocation && (
              <Box sx={{ mb: 3 }}>
                <Typography gutterBottom>
                  Mesafe: {filters.distance} km
                </Typography>
                <Slider
                  value={filters.distance}
                  onChange={handleDistanceChange}
                  min={1}
                  max={200}
                  valueLabelDisplay="auto"
                />
              </Box>
            )}

            <Button
              variant="contained"
              onClick={searchUsers}
              fullWidth
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Kullanıcıları Bul'}
            </Button>
          </Paper>
        ) : (
          <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
            {loading ? (
              <Box display="flex" justifyContent="center">
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error">{error}</Alert>
            ) : users.length === 0 ? (
              <Box textAlign="center">
                <Typography variant="h6" gutterBottom>
                  Kriterlere uygun kullanıcı bulunamadı
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => setShowPreferences(true)}
                  sx={{ mt: 2 }}
                >
                  Kriterleri Değiştir
                </Button>
              </Box>
            ) : currentIndex >= users.length ? (
              <Box textAlign="center">
                <Typography variant="h6" gutterBottom>
                  Tüm kullanıcıları gördünüz
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => setShowPreferences(true)}
                  sx={{ mt: 2 }}
                >
                  Yeni Arama Yap
                </Button>
              </Box>
            ) : (
              <AnimatePresence>
                <motion.div
                  key={currentIndex}
                  initial={{ x: 300, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -300, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={(e, { offset, velocity }) => {
                    const swipe = offset.x + velocity.x;
                    if (Math.abs(swipe) > 100) {
                      handleSwipe(swipe);
                    }
                  }}
                >
                  <Card sx={{ maxWidth: 600, mx: 'auto', position: 'relative' }}>
                    <Box sx={{ position: 'relative', paddingTop: '100%' }}>
                      <CardMedia
                        component="img"
                        image={currentUser.photos?.[0] || DEFAULT_PHOTO}
                        alt={currentUser.name}
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    </Box>
                    <CardContent>
                      <Typography variant="h5" gutterBottom>
                        {currentUser.name}, {currentUser.age}
                      </Typography>
                      {currentUser.distance && (
                        <Typography variant="body2" color="text.secondary">
                          {currentUser.distance.toFixed(1)} km uzaklıkta
                        </Typography>
                      )}
                      {currentUser.bio && (
                        <Typography variant="body1" color="text.secondary">
                          {currentUser.bio}
                        </Typography>
                      )}
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'space-evenly', p: 2 }}>
                      <IconButton
                        size="large"
                        onClick={handleDislike}
                        sx={{
                          bgcolor: 'error.light',
                          color: 'white',
                          '&:hover': { bgcolor: 'error.main' }
                        }}
                      >
                        <CloseIcon fontSize="large" />
                      </IconButton>
                      <IconButton
                        size="large"
                        onClick={handleLike}
                        sx={{
                          bgcolor: 'success.light',
                          color: 'white',
                          '&:hover': { bgcolor: 'success.main' }
                        }}
                      >
                        <FavoriteIcon fontSize="large" />
                      </IconButton>
                    </CardActions>
                  </Card>
                </motion.div>
              </AnimatePresence>
            )}

            <Snackbar
              open={matchAlert}
              autoHideDuration={6000}
              onClose={() => setMatchAlert(false)}
              message="Yeni bir eşleşmeniz var! 🎉"
              action={
                <Button color="primary" size="small" onClick={() => setCurrentView('matches')}>
                  Eşleşmeleri Gör
                </Button>
              }
            />
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Box
        sx={{
          width: 240,
          flexShrink: 0,
          borderRight: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}
      >
        <List>
          <ListItemButton
            selected={currentView === 'matches'}
            onClick={handleMatchesClick}
          >
            <ListItemIcon>
              <Badge
                variant="dot"
                color="error"
                invisible={!hasNewMatch}
                sx={{
                  '& .MuiBadge-badge': {
                    backgroundColor: '#ff69b4',
                    color: '#ff69b4'
                  }
                }}
              >
                <FavoriteIcon />
              </Badge>
            </ListItemIcon>
            <ListItemText primary="Eşleşmelerim" />
          </ListItemButton>
          <ListItemButton
            selected={currentView === 'messages'}
            onClick={() => setCurrentView('messages')}
          >
            <ListItemIcon>
              <Badge
                variant="dot"
                color="error"
                invisible={!hasUnreadMessages}
                sx={{
                  '& .MuiBadge-badge': {
                    backgroundColor: '#ff69b4',
                    color: '#ff69b4'
                  }
                }}
              >
                <MessageIcon />
              </Badge>
            </ListItemIcon>
            <ListItemText primary="Mesajlar" />
          </ListItemButton>
          <ListItemButton
            selected={currentView === 'find-friends'}
            onClick={() => setCurrentView('find-friends')}
          >
            <ListItemIcon>
              <PeopleIcon />
            </ListItemIcon>
            <ListItemText primary="Arkadaş Bul" />
          </ListItemButton>
          <ListItemButton
            selected={currentView === 'settings'}
            onClick={() => setCurrentView('settings')}
          >
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Ayarlar" />
          </ListItemButton>
        </List>
      </Box>

      <Box sx={{ flexGrow: 1, p: 3, overflow: 'auto' }}>
        {renderContent()}
      </Box>
    </Box>
  );
};

export default FindFriends; 