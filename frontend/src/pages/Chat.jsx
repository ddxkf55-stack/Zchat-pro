import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../hooks/useSocket.js';
import Sidebar from '../components/Sidebar.jsx';
import ChatArea from '../components/ChatArea.jsx';
import InfoPanel from '../components/InfoPanel.jsx';
import ProfileModal from '../components/ProfileModal.jsx';
import VoiceCall from '../components/VoiceCall.jsx';
import Icon from '../components/Icon.jsx';

export default function Chat() {
  const { user, logout, checkAuth, updateUser } = useAuth();
  const socketRef = useSocket();
  const [allUsers, setAllUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [activeTab, setActiveTab] = useState('chats');
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [showProfile, setShowProfile] = useState(false);
  const [showCall, setShowCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      const valid = await checkAuth();
      if (!valid) { navigate('/login'); return; }
      await Promise.all([fetchUsers(), fetchContacts(), fetchFavorites()]);
    };
    init();
  }, []);

  // تحديث البروفايل من الخادم
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await axios.get('/api/users/profile');
        updateUser(data);
      } catch {}
    };
    if (user) fetchProfile();
  }, []);

  // استقبال الرسائل
  useEffect(() => {
    if (!socketRef.current) return;
    const socket = socketRef.current;
    
    socket.on('message:new', (msg) => {
      if (selected && (msg.from === selected.id || msg.to === selected.id)) {
        setMessages(prev => [...prev, msg]);
      }
    });
    socket.on('voice:new', (msg) => {
      if (selected && (msg.from === selected.id || msg.to === selected.id)) {
        setMessages(prev => [...prev, { ...msg, type: 'voice' }]);
      }
    });
    socket.on('sticker:new', (msg) => {
      if (selected && (msg.from === selected.id || msg.to === selected.id)) {
        setMessages(prev => [...prev, { ...msg, type: 'sticker' }]);
      }
    });
    socket.on('call:incoming', (data) => setIncomingCall(data));

    return () => {
      socket.off('message:new');
      socket.off('voice:new');
      socket.off('sticker:new');
      socket.off('call:incoming');
    };
  }, [socketRef, selected]);

  const fetchUsers = async () => {
    try {
      const { data } = await axios.get('/api/users');
      setAllUsers(data);
    } catch {}
  };

  const fetchContacts = async () => {
    try {
      const { data } = await axios.get('/api/users/contacts');
      setContacts(data);
    } catch {}
  };

  const fetchFavorites = async () => {
    try {
      const { data } = await axios.get('/api/users/favorites');
      setFavorites(data);
    } catch {}
  };

  // جلب الرسائل المحفوظة عند اختيار مستخدم
  const handleSelectUser = async (u) => {
    setSelected(u);
    setMessages([]);
    try {
      const { data } = await axios.get(`/api/messages/${u.id}`);
      setMessages(data);
    } catch {}
  };

  const handleSendMessage = async (content, type = 'text') => {
    if (!selected || !socketRef.current) return;
    
    if (type === 'voice') {
      // content is { url, duration }
      socketRef.current.emit('voice:send', {
        to: selected.id,
        url: content.url,
        duration: content.duration
      });
      setMessages(prev => [...prev, {
        from: user.id,
        fromUsername: user.username,
        to: selected.id,
        type: 'voice',
        url: content.url,
        duration: content.duration,
        timestamp: Date.now()
      }]);
    } else if (type === 'sticker') {
      socketRef.current.emit('sticker:send', { to: selected.id, sticker: content });
      setMessages(prev => [...prev, {
        from: user.id,
        fromUsername: user.username,
        to: selected.id,
        type: 'sticker',
        sticker: content,
        timestamp: Date.now()
      }]);
    } else {
      socketRef.current.emit('message:send', { to: selected.id, type: 'text', content });
      setMessages(prev => [...prev, {
        from: user.id,
        fromUsername: user.username,
        to: selected.id,
        type: 'text',
        content,
        timestamp: Date.now()
      }]);
    }
  };

  const handleAddToContacts = async (userId) => {
    try {
      await axios.post(`/api/users/contacts/${userId}`);
      await fetchContacts();
    } catch {}
  };

  const handleRemoveFromContacts = async (userId) => {
    try {
      await axios.delete(`/api/users/contacts/${userId}`);
      await fetchContacts();
    } catch {}
  };

  const handleAddToFavorites = async (userId) => {
    try {
      await axios.post(`/api/users/favorites/${userId}`);
      await fetchFavorites();
    } catch {}
  };

  const handleRemoveFromFavorites = async (userId) => {
    try {
      await axios.delete(`/api/users/favorites/${userId}`);
      await fetchFavorites();
    } catch {}
  };

  const getDisplayUsers = () => {
    let list = [];
    if (activeTab === 'chats') list = allUsers;
    else if (activeTab === 'contacts') list = contacts;
    else if (activeTab === 'favorites') list = favorites;
    
    if (searchTerm) {
      list = list.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return list;
  };

  return (
    <div className="chat-app-container">
      <Sidebar 
        users={getDisplayUsers()}
        selected={selected}
        onSelect={handleSelectUser}
        onLogout={() => { logout(); navigate('/login'); }}
        onProfileClick={() => setShowProfile(true)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        contactsCount={contacts.length}
        favoritesCount={favorites.length}
      />
      <ChatArea 
        user={user}
        selected={selected}
        messages={messages}
        onSendMessage={handleSendMessage}
        onCall={() => setShowCall(true)}
        onToggleInfo={() => setShowInfoPanel(!showInfoPanel)}
        showInfoPanel={showInfoPanel}
        onAddToContacts={handleAddToContacts}
        onAddToFavorites={handleAddToFavorites}
        onRemoveFromContacts={handleRemoveFromContacts}
        onRemoveFromFavorites={handleRemoveFromFavorites}
      />
      {showInfoPanel && selected && (
        <InfoPanel 
          user={selected}
          currentUser={user}
          onClose={() => setShowInfoPanel(false)}
          onAddToContacts={handleAddToContacts}
          onAddToFavorites={handleAddToFavorites}
          onRemoveFromContacts={handleRemoveFromContacts}
          onRemoveFromFavorites={handleRemoveFromFavorites}
        />
      )}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {showCall && selected && (
        <VoiceCall target={selected} socketRef={socketRef} onEnd={() => setShowCall(false)} />
      )}
      {incomingCall && (
        <VoiceCall 
          target={{ id: incomingCall.from, username: incomingCall.fromUsername }}
          socketRef={socketRef}
          onEnd={() => setIncomingCall(null)}
          incoming={incomingCall}
        />
      )}
    </div>
  );
}