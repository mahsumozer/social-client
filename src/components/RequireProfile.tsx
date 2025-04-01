import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { auth, profiles } from '../lib/supabase';
import { CircularProgress, Box } from '@mui/material';

interface RequireProfileProps {
  children: React.ReactNode;
}

const RequireProfile: React.FC<RequireProfileProps> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkProfile = async () => {
      try {
        const { data: { user }, error: authError } = await auth.getUser();
        if (authError || !user) {
          setLoading(false);
          return;
        }

        const isProfileComplete = await profiles.isProfileComplete(user.id);
        setIsComplete(isProfileComplete);
      } catch (error) {
        console.error('Profil kontrolü sırasında hata:', error);
      } finally {
        setLoading(false);
      }
    };

    checkProfile();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!isComplete && location.pathname !== '/profile') {
    return <Navigate to="/profile" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default RequireProfile; 