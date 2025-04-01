import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Matches from './pages/Matches';
import FindFriends from './pages/FindFriends';
import UserProfile from './pages/UserProfile';
import RequireProfile from './components/RequireProfile';
import Settings from './pages/Settings';

const theme = createTheme({
  palette: {
    primary: {
      main: '#ff4081',
    },
    secondary: {
      main: '#3f51b5',
    },
  },
});

// UserProfile için wrapper bileşeni
const UserProfileWrapper = () => {
  const { userId } = useParams<{ userId: string }>();
  return userId ? <UserProfile userId={userId} /> : null;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Navbar />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={
            <RequireProfile>
              <Settings />
            </RequireProfile>
          } />
          <Route path="/find-friends" element={
            <RequireProfile>
              <FindFriends />
            </RequireProfile>
          } />
          <Route path="/matches" element={
            <RequireProfile>
              <Matches />
            </RequireProfile>
          } />
          <Route path="/user/:userId" element={
            <RequireProfile>
              <UserProfileWrapper />
            </RequireProfile>
          } />
          <Route path="/" element={
            <Navigate to="/find-friends" />
          } />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
