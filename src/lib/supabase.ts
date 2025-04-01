import { createClient } from '@supabase/supabase-js';
import { resizeImage } from './imageUtils';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Kullanıcı işlemleri
export const auth = {
  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    
    if (!error && data.user) {
      // Yeni kullanıcı için profil oluştur
      await supabase
        .from('profiles')
        .insert([
          { 
            id: data.user.id,
            email: data.user.email,
            photos: []
          }
        ]);
    }
    
    return { data, error };
  },
  signIn: async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  },
  signOut: async () => {
    return await supabase.auth.signOut();
  },
  getUser: async () => {
    return await supabase.auth.getUser();
  }
};

// Profil işlemleri
export const profiles = {
  getProfile: async (userId: string) => {
    return await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
  },

  isProfileComplete: async (userId: string) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('name, age, gender, bio')
      .eq('id', userId)
      .single();

    if (error) return false;
    
    return !!(
      profile &&
      profile.name &&
      profile.age &&
      profile.gender &&
      profile.bio
    );
  },

  updateProfile: async (userId: string, profileData: any) => {
    return await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', userId);
  },

  getPotentialMatches: async (userId: string, gender: string) => {
    return await supabase
      .from('profiles')
      .select('*')
      .neq('id', userId)
      .eq('gender', gender === 'male' ? 'female' : 'male');
  },
  searchUsers: async ({ userId, minAge, maxAge, gender }: { 
    userId: string;
    minAge: number;
    maxAge: number;
    gender: string;
  }) => {
    try {
      // Önce kullanıcının beğendiği profilleri al
      const { data: likedUsers } = await supabase
        .from('likes')
        .select('liked_user_id')
        .eq('user_id', userId);

      // Beğenilen kullanıcı ID'lerini bir diziye dönüştür
      const likedUserIds = likedUsers?.map(like => like.liked_user_id) || [];
      
      // Kullanıcının kendisi ve beğendiği kullanıcılar hariç arama yap
      let query = supabase
        .from('profiles')
        .select('*')
        .neq('id', userId);

      // Beğenilen kullanıcıları filtrele
      if (likedUserIds.length > 0) {
        query = query.not('id', 'in', `(${likedUserIds.join(',')})`);
      }

      // Yaş filtresi
      query = query
        .gte('age', minAge)
        .lte('age', maxAge);

      // Cinsiyet filtresi
      if (gender !== 'all') {
        query = query.eq('gender', gender);
      }

      return await query;
    } catch (error) {
      console.error('Kullanıcı arama hatası:', error);
      throw error;
    }
  },
  
  searchNearbyUsers: async ({ 
    userId, 
    latitude, 
    longitude, 
    distance = 50, 
    limit = 20,
    minAge = 18,
    maxAge = 99,
    gender = 'all'
  }: { 
    userId: string;
    latitude: number;
    longitude: number;
    distance?: number;
    limit?: number;
    minAge?: number;
    maxAge?: number;
    gender?: string;
  }) => {
    try {
      // Önce kullanıcının konum bilgilerini kontrol et
      if (!latitude || !longitude) {
        throw new Error('Konum bilgileri eksik. Önce ayarlardan konum belirlemelisiniz.');
      }

      // Önce kullanıcının beğendiği profilleri al
      const { data: likedUsers } = await supabase
        .from('likes')
        .select('liked_user_id')
        .eq('user_id', userId);

      // Beğenilen kullanıcı ID'lerini bir diziye dönüştür
      const likedUserIds = likedUsers?.map(like => like.liked_user_id) || [];
      
      // nearby_users fonksiyonunu çağırarak yakındaki kullanıcıları bul
      const { data, error } = await supabase
        .rpc('nearby_users', {
          lat: latitude,
          long: longitude,
          distance_km: distance,
          max_users: limit
        });
      
      if (error) throw error;
      
      // Beğenilenleri ve yaş/cinsiyet filtrelerini uygula
      const filteredUsers = data
        .filter((user: any) => !likedUserIds.includes(user.id))
        .filter((user: any) => user.age >= minAge && user.age <= maxAge)
        .filter((user: any) => gender === 'all' || user.gender === gender);
        
      return { data: filteredUsers, error: null };
    } catch (error) {
      console.error('Yakındaki kullanıcıları arama hatası:', error);
      throw error;
    }
  }
};

// Eşleşme işlemleri
export const matches = {
  createLike: async (userId: string, likedUserId: string) => {
    // Önce mevcut beğeni kontrolü yap
    const { data: existingLike } = await supabase
      .from('likes')
      .select('*')
      .eq('user_id', userId)
      .eq('liked_user_id', likedUserId)
      .single();

    if (existingLike) {
      return { data: existingLike, error: null };
    }

    return await supabase
      .from('likes')
      .insert([
        { user_id: userId, liked_user_id: likedUserId }
      ]);
  },

  checkMatch: async (userId: string, otherUserId: string) => {
    // İlk kullanıcının ikinci kullanıcıyı beğenip beğenmediğini kontrol et
    const { data: firstLike, error: firstError } = await supabase
      .from('likes')
      .select('*')
      .eq('user_id', userId)
      .eq('liked_user_id', otherUserId)
      .single();

    if (firstError) return false;

    // İkinci kullanıcının ilk kullanıcıyı beğenip beğenmediğini kontrol et
    const { data: secondLike, error: secondError } = await supabase
      .from('likes')
      .select('*')
      .eq('user_id', otherUserId)
      .eq('liked_user_id', userId)
      .single();

    // Her iki kullanıcı da birbirini beğenmişse true döndür
    return !secondError && firstLike && secondLike;
  },

  getMatches: async (userId: string) => {
    return await supabase
      .from('matches')
      .select(`
        *,
        user1:profiles!matches_user1_id_fkey(id, name, age, photos),
        user2:profiles!matches_user2_id_fkey(id, name, age, photos)
      `)
      .or('user1_id.eq.' + userId + ',user2_id.eq.' + userId);
  }
};

// Storage işlemleri
export const storage = {
  uploadProfilePhoto: async (userId: string, file: File) => {
    try {
      // Resmi boyutlandır
      const resizedImage = await resizeImage(file, 600, 600);
      
      const fileExt = 'jpg'; // JPEG olarak kaydet
      const fileName = `${Date.now()}.${fileExt}`;
      // Dosya yolunu kullanıcı ID'si ile başlat (RLS politikasına uymak için)
      const filePath = `${userId}/${fileName}`;

      // Dosyayı yükle
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, resizedImage, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Public URL'i al
      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);

      // Profili güncelle
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('photos')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      const currentPhotos = profile?.photos || [];
      const updatedPhotos = [...currentPhotos, publicUrl];

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ photos: updatedPhotos })
        .eq('id', userId);

      if (updateError) throw updateError;

      return { publicUrl, error: null };
    } catch (error) {
      console.error('Fotoğraf yükleme hatası:', error);
      return { publicUrl: '', error };
    }
  },

  deleteProfilePhoto: async (userId: string, photoUrl: string) => {
    try {
      // URL'den dosya yolunu çıkar
      const urlParts = photoUrl.split('/');
      // Örneğin: https://zcpwfisiezyrbhwvzxmi.supabase.co/storage/v1/object/public/photos/userId/filename.jpg
      // Dosya yolu: userId/filename.jpg olmalı
      const pathParts = urlParts.slice(-2); // son iki parçayı al: userId ve fileName
      const filePath = pathParts.join('/');
      
      // Dosyayı storage'dan sil
      const { error: deleteError } = await supabase.storage
        .from('photos')
        .remove([filePath]);
  
      if (deleteError) throw deleteError;
  
      // Profildeki photos dizisinden URL'i kaldır
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('photos')
        .eq('id', userId)
        .single();
  
      if (profileError) throw profileError;
  
      const updatedPhotos = profile.photos.filter((url: string) => url !== photoUrl);
  
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ photos: updatedPhotos })
        .eq('id', userId);
  
      if (updateError) throw updateError;
  
      return true;
    } catch (error) {
      console.error('Fotoğraf silme hatası:', error);
      throw error;
    }
  }
};

// Mesajlaşma işlemleri
export const messages = {
  getChatUsers: async (userId: string) => {
    try {
      // Eşleşen kullanıcıları getir
      const matchesResponse = await matches.getMatches(userId);
      if (matchesResponse.error) throw matchesResponse.error;

      // Eşleşen kullanıcıların profillerini getir
      const chatUsers = matchesResponse.data.map(match => {
        const otherUser = match.user1_id === userId ? match.user2 : match.user1;
        return {
          id: otherUser.id,
          name: otherUser.name,
          photos: otherUser.photos
        };
      });

      return { data: chatUsers, error: null };
    } catch (error) {
      return { data: [], error };
    }
  },

  getMessages: async (userId: string, otherUserId: string) => {
    return await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: true });
  },

  sendMessage: async (senderId: string, receiverId: string, content: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: senderId,
          receiver_id: receiverId,
          content
        })
        .select()
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  subscribeToMessages: (userId: string, otherUserId: string | null, callback: (message: any) => void) => {
    let channel = supabase.channel('messages_channel');
    
    if (otherUserId) {
      // Belirli bir kullanıcı ile olan mesajları dinle
      channel = channel
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `(sender_id=eq.${userId}::text.and.receiver_id=eq.${otherUserId}::text).or.(sender_id=eq.${otherUserId}::text.and.receiver_id=eq.${userId}::text)`
        }, (payload) => {
          callback(payload.new);
        });
    } else {
      // Tüm gelen/giden mesajları dinle
      channel = channel
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${userId}::text.or.receiver_id=eq.${userId}::text`
        }, (payload) => {
          callback(payload.new);
        });
    }
    
    return channel.subscribe();
  },

  deleteAllMessages: async (userId: string, otherUserId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`);

      return { error };
    } catch (error) {
      return { error };
    }
  },

  getUnreadMessagesCount: async (userId: string) => {
    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .is('read_at', null);
      
      return { data: count || 0, error };
    } catch (error) {
      return { data: 0, error };
    }
  },

  markMessagesAsRead: async (receiverId: string, senderId: string) => {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('messages')
        .update({ read_at: now })
        .eq('receiver_id', receiverId)
        .eq('sender_id', senderId)
        .is('read_at', null);
      
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }
}; 