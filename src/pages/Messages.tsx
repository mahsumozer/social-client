import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Paper,
  CircularProgress,
  Alert,
  IconButton,
  Divider,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Badge
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import UserProfile from './UserProfile';
import { auth, profiles, messages } from '../lib/supabase';

// Emoji listesi
const EMOJIS = ['😊', '😂', '❤️', '👍', '😍', '🎉', '🔥', '😎', '🤗', '😘', '🙌', '👋', '💪', '🤔', '😅'];

interface MessagesProps {
  selectedUserId: string | null;
  onUnreadMessagesChange?: (hasUnread: boolean) => void;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

interface ChatUser {
  id: string;
  name: string;
  photos: string[];
  hasUnread?: boolean;
}

const Messages: React.FC<MessagesProps> = ({ selectedUserId, onUnreadMessagesChange }) => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [emojiAnchorEl, setEmojiAnchorEl] = useState<null | HTMLElement>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [unreadSenders, setUnreadSenders] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadCurrentUser = async () => {
      const { data: { user } } = await auth.getUser();
      setCurrentUserId(user?.id || null);
    };

    loadCurrentUser();
  }, []);

  useEffect(() => {
    const loadChatUsers = async () => {
      if (!currentUserId) return;

      try {
        // Önce tüm kullanıcıları al
        const { data: matches, error: matchesError } = await messages.getChatUsers(currentUserId);
        if (matchesError) throw matchesError;

        // Her kullanıcı için okunmamış mesajları kontrol et
        const updatedUsers = await Promise.all(matches.map(async (user) => {
          const { data: messageList, error: messagesError } = await messages.getMessages(currentUserId, user.id);
          if (messagesError) throw messagesError;
          
          const hasUnread = messageList.some(msg => msg.sender_id === user.id && msg.read_at === null);
          return { ...user, hasUnread };
        }));

        setChatUsers(updatedUsers);

        // Eğer seçili kullanıcı varsa, o kullanıcıyı seç
        if (selectedUserId) {
          const selectedMatch = updatedUsers.find(match => match.id === selectedUserId);
          if (selectedMatch) {
            setSelectedUser(selectedMatch);
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadChatUsers();
  }, [currentUserId, selectedUserId]);

  useEffect(() => {
    const loadMessages = async () => {
      if (!currentUserId || !selectedUser) return;

      try {
        const { data: messageList, error: messagesError } = await messages.getMessages(currentUserId, selectedUser.id);
        if (messagesError) throw messagesError;

        setChatMessages(messageList);
        scrollToBottom();

        // Seçili kullanıcının mesajlarını okundu olarak işaretle
        await messages.markMessagesAsRead(currentUserId, selectedUser.id);
        
        // Diğer okunmamış mesajları kontrol et
        const { data: unreadCount } = await messages.getUnreadMessagesCount(currentUserId);
        setHasUnreadMessages(unreadCount > 0);

        // Mesajlar yüklendiğinde bildirimleri kontrol et
        const updatedUsers = chatUsers.map(user => {
          const hasUnread = messageList.some(msg => msg.sender_id === user.id && msg.read_at === null);
          return { ...user, hasUnread };
        });
        setChatUsers(updatedUsers);
      } catch (err: any) {
        setError(err.message);
      }
    };

    loadMessages();

    // Mesajları gerçek zamanlı dinle
    const subscription = messages.subscribeToMessages(
      currentUserId || '',
      selectedUser?.id || null,
      (newMessage) => {
        // Eğer mesaj seçili kullanıcıdan geldiyse, mesajı göster
        if (selectedUser && (newMessage.sender_id === selectedUser.id || newMessage.receiver_id === selectedUser.id)) {
          setChatMessages(prev => [...prev, newMessage]);
          scrollToBottom();
          
          // Mesajı okundu olarak işaretle
          if (newMessage.sender_id === selectedUser.id && currentUserId) {
            messages.markMessagesAsRead(currentUserId, selectedUser.id);
          }
          
          // Yeni mesaj gönderen kullanıcıyı en üste taşı
          if (selectedUser && newMessage.sender_id !== currentUserId) {
            setChatUsers(prev => {
              const filteredUsers = prev.filter(user => user.id !== selectedUser.id);
              return [selectedUser, ...filteredUsers];
            });
          }
        } 
        
        // Yeni mesaj varsa, okunmamış mesajları kontrol et
        if (newMessage.receiver_id === currentUserId && (!selectedUser || newMessage.sender_id !== selectedUser.id)) {
          setHasUnreadMessages(true);
          // Gönderen kullanıcının hasUnread durumunu güncelle
          setChatUsers(prev => prev.map(user => 
            user.id === newMessage.sender_id 
              ? { ...user, hasUnread: true }
              : user
          ));
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUserId, selectedUser]);

  // hasUnreadMessages değiştiğinde dışarı bildir
  useEffect(() => {
    if (onUnreadMessagesChange) {
      onUnreadMessagesChange(hasUnreadMessages);
    }
  }, [hasUnreadMessages, onUnreadMessagesChange]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !currentUserId || !selectedUser) return;

    try {
      const { data, error } = await messages.sendMessage(currentUserId, selectedUser.id, messageText);
      if (error) throw error;

      // Gönderilen mesajı hemen görüntüle
      if (data) {
        setChatMessages(prev => [...prev, data]);
        scrollToBottom();
        
        // Mesaj gönderilen kullanıcıyı en üste taşı
        if (selectedUser) {
          setChatUsers(prev => {
            // Seçili kullanıcıyı listeden kaldır
            const filteredUsers = prev.filter(user => user.id !== selectedUser.id);
            // Seçili kullanıcıyı listenin başına ekle
            return [selectedUser, ...filteredUsers];
          });
        }
      }
      
      setMessageText('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUserSelect = (user: ChatUser) => {
    setSelectedUser(user);
    setChatMessages([]);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleBlockUser = async () => {
    if (!currentUserId || !selectedUser) return;
    try {
      // Burada bloklama işlemi yapılacak
      handleMenuClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteMessages = async () => {
    if (!currentUserId || !selectedUser) return;
    try {
      await messages.deleteAllMessages(currentUserId, selectedUser.id);
      setChatMessages([]);
      setShowDeleteDialog(false);
      handleMenuClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEmojiMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setEmojiAnchorEl(event.currentTarget);
  };

  const handleEmojiMenuClose = () => {
    setEmojiAnchorEl(null);
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageText(prev => prev + emoji);
    handleEmojiMenuClose();
  };

  const handleUserProfileClick = () => {
    if (selectedUser) {
      setShowProfile(true);
    }
  };

  const handleBackToMessages = () => {
    setShowProfile(false);
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

  return (
    <Box sx={{ display: 'flex', height: '100%', gap: 2 }}>
      {/* Sohbet Listesi */}
      <Paper sx={{ width: 300, overflow: 'auto' }}>
        <List>
          {chatUsers.map(user => (
            <React.Fragment key={user.id}>
              <ListItemButton
                selected={selectedUser?.id === user.id}
                onClick={() => handleUserSelect(user)}
              >
                <ListItemAvatar>
                  <Badge
                    variant="dot"
                    color="error"
                    invisible={!user.hasUnread}
                    sx={{
                      '& .MuiBadge-badge': {
                        backgroundColor: '#ff69b4',
                        color: '#ff69b4'
                      }
                    }}
                  >
                    <Avatar src={user.photos?.[0]} alt={user.name} />
                  </Badge>
                </ListItemAvatar>
                <ListItemText primary={user.name} />
              </ListItemButton>
              <Divider />
            </React.Fragment>
          ))}
        </List>
      </Paper>

      {/* Mesajlaşma Alanı */}
      <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selectedUser ? (
          showProfile ? (
            <>
              <Box sx={{ 
                p: 2, 
                borderBottom: 1, 
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                gap: 2
              }}>
                <IconButton onClick={handleBackToMessages}>
                  <ArrowBackIcon />
                </IconButton>
                <Typography variant="h6">Profil</Typography>
              </Box>
              <Box sx={{ flex: 1, overflow: 'auto' }}>
                <UserProfile userId={selectedUser.id} />
              </Box>
            </>
          ) : (
            <>
              {/* Sohbet Başlığı */}
              <Box sx={{ 
                p: 2, 
                borderBottom: 1, 
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    cursor: 'pointer'
                  }}
                  onClick={handleUserProfileClick}
                >
                  <Avatar src={selectedUser.photos?.[0]} alt={selectedUser.name} />
                  <Typography variant="h6">
                    {selectedUser.name}
                  </Typography>
                </Box>
                <IconButton onClick={handleMenuClick}>
                  <MoreVertIcon />
                </IconButton>
              </Box>

              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
              >
                <MenuItem onClick={() => {
                  setShowDeleteDialog(true);
                  handleMenuClose();
                }}>Tüm mesajları sil</MenuItem>
                <MenuItem onClick={handleBlockUser}>Kullanıcıyı engelle</MenuItem>
              </Menu>

              <Dialog
                open={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
              >
                <DialogTitle>Mesajları Sil</DialogTitle>
                <DialogContent>
                  Tüm mesajları silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setShowDeleteDialog(false)}>İptal</Button>
                  <Button onClick={handleDeleteMessages} color="error">
                    Sil
                  </Button>
                </DialogActions>
              </Dialog>

              {/* Mesajlar */}
              <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                {chatMessages.map((message) => (
                  <Box
                    key={message.id}
                    sx={{
                      display: 'flex',
                      justifyContent: message.sender_id === currentUserId ? 'flex-end' : 'flex-start',
                      mb: 1
                    }}
                  >
                    <Paper
                      sx={{
                        p: 1,
                        backgroundColor: message.sender_id === currentUserId ? 'primary.main' : 'grey.100',
                        color: message.sender_id === currentUserId ? 'white' : 'text.primary',
                        maxWidth: '70%'
                      }}
                    >
                      <Typography variant="body2" color="textSecondary">
                        {message.sender_id === currentUserId ? 'Siz' : chatUsers.find(user => user.id === message.sender_id)?.name || 'Bilinmeyen'}
                      </Typography>
                      <Typography variant="body1">
                        {message.content}
                      </Typography>
                    </Paper>
                  </Box>
                ))}
                <div ref={messagesEndRef} />
              </Box>

              {/* Mesaj Gönderme */}
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1 }}>
                <IconButton
                  color="primary"
                  onClick={handleEmojiMenuClick}
                >
                  <EmojiEmotionsIcon />
                </IconButton>
                <TextField
                  fullWidth
                  placeholder="Mesajınızı yazın..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <IconButton
                  color="primary"
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                >
                  <SendIcon />
                </IconButton>
              </Box>

              <Menu
                anchorEl={emojiAnchorEl}
                open={Boolean(emojiAnchorEl)}
                onClose={handleEmojiMenuClose}
              >
                <Box sx={{ p: 1, width: 280, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {EMOJIS.map((emoji, index) => (
                    <IconButton key={index} onClick={() => handleEmojiSelect(emoji)}>
                      <Typography variant="h6">{emoji}</Typography>
                    </IconButton>
                  ))}
                </Box>
              </Menu>
            </>
          )
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography color="text.secondary">
              Sohbet etmek için bir kullanıcı seçin
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default Messages; 