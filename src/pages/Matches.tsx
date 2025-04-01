import React, { useEffect, useState } from 'react';
import { 
  Typography, 
  Box, 
  CircularProgress, 
  Alert, 
  Card, 
  CardContent, 
  CardMedia,
  CardActions,
  Button,
  IconButton
} from '@mui/material';
import { auth, matches } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import MessageIcon from '@mui/icons-material/Message';
import PersonIcon from '@mui/icons-material/Person';

interface Profile {
  id: string;
  name: string;
  age: number;
  photos: string[] | null;
  bio?: string;
}

interface Match {
  id: string;
  user1: Profile;
  user2: Profile;
  user1_id: string;
  user2_id: string;
}

const DEFAULT_PHOTO = 'https://source.unsplash.com/random/400x400?portrait';

interface MatchesProps {
  onProfileClick?: (userId: string) => void;
  onMessageClick?: (userId: string) => void;
  onMatchesViewed?: () => void;
}

const Matches: React.FC<MatchesProps> = ({ onProfileClick, onMessageClick, onMatchesViewed }) => {
  const navigate = useNavigate();
  const [userMatches, setUserMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadMatches = async () => {
      try {
        const { data: { user }, error: userError } = await auth.getUser();
        if (userError) throw userError;

        if (user) {
          setCurrentUserId(user.id);
          const { data, error: matchesError } = await matches.getMatches(user.id);
          if (matchesError) throw matchesError;

          setUserMatches(data || []);
          if (onMatchesViewed) {
            onMatchesViewed();
          }
        }
      } catch (error: any) {
        setError(error.message || 'Eşleşmeler yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    loadMatches();
  }, [onMatchesViewed]);

  const handleProfileClick = (userId: string) => {
    if (onProfileClick) {
      onProfileClick(userId);
    }
  };

  const handleMessageClick = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMessageClick) {
      onMessageClick(userId);
    } else {
      navigate('/messages');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Eşleşmelerim
      </Typography>
      
      {userMatches.length === 0 ? (
        <Typography variant="body1" align="center">
          Henüz eşleşme bulunamadı.
        </Typography>
      ) : (
        <Box sx={{ 
          display: 'grid', 
          gap: 3,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(4, 1fr)'
          },
          maxWidth: 1200,
          mx: 'auto'
        }}>
          {userMatches.map((match) => {
            const matchedProfile = match.user1_id === currentUserId ? match.user2 : match.user1;
            
            return (
              <Card 
                key={match.id} 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  cursor: 'pointer'
                }}
                onClick={() => handleProfileClick(matchedProfile.id)}
              >
                <Box 
                  sx={{ 
                    position: 'relative', 
                    paddingTop: '100%'
                  }}
                >
                  <CardMedia
                    component="img"
                    image={matchedProfile.photos?.[0] || DEFAULT_PHOTO}
                    alt={matchedProfile.name}
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
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    {matchedProfile.name}, {matchedProfile.age}
                  </Typography>
                  {matchedProfile.bio && (
                    <Typography variant="body2" color="text.secondary">
                      {matchedProfile.bio}
                    </Typography>
                  )}
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', p: 1 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<MessageIcon />}
                    onClick={(e) => handleMessageClick(matchedProfile.id, e)}
                    size="small"
                  >
                    Mesaj
                  </Button>
                  <IconButton
                    color="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProfileClick(matchedProfile.id);
                    }}
                  >
                    <PersonIcon />
                  </IconButton>
                </CardActions>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default Matches; 