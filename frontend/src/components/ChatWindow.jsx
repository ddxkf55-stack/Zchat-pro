import { useState, useEffect, useRef } from 'react';
import Message from './Message.jsx';
import VoiceRecorder from './VoiceRecorder.jsx';
import StickerPicker from './StickerPicker.jsx';
import Icon from './Icon.jsx';
import axios from 'axios';

export default function ChatWindow({ user, target, socketRef, onCall }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const [recording, setRecording] = useState(false);
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!target || !socketRef.current) return;

    setLoading(true);
    const socket = socketRef.current;

    const handleMessage = (msg) => {
      if ((msg.from === target.id || msg.to === target.id) && msg.type === 'text') {
        setMessages(prev => [...prev, { ...msg, type: 'text' }]);
      }
    };

    const handleVoice = (msg) => {
      if (msg.from === target.id) {
        setMessages(prev => [...prev, { ...msg, type: 'voice' }]);
      }
    };

    const handleSticker = (msg) => {
      if (msg.from === target.id) {
        setMessages(prev => [...prev, { ...msg, type: 'sticker' }]);
      }
    };

    socket.on('message:new', handleMessage);
    socket.on('voice:new', handleVoice);
    socket.on('sticker:new', handleSticker);

    setLoading(false);

    return () => {
      socket.off('message:new', handleMessage);
      socket.off('voice:new', handleVoice);
      socket.off('sticker:new', handleSticker);
    };
  }, [target, socketRef]);

  useEffect(() => {
    setMessages([]);
    setText('');
  }, [target?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTextChange = (e) => {
    setText(e.target.value);
    
    if (!typing && e.target.value.length > 0) {
      setTyping(true);
      socketRef.current?.emit('typing:start', { to: target.id });
    } else if (typing && e.target.value.length === 0) {
      setTyping(false);
      socketRef.current?.emit('typing:stop', { to: target.id });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (e.target.value.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(false);
        socketRef.current?.emit('typing:stop', { to: target.id });
      }, 2000);
    }
  };

  const sendMessage = () => {
    if (!text.trim() || !target || !socketRef.current) return;

    const msg = {
      to: target.id,
      type: 'text',
      content: text.trim(),
      id: Date.now().toString()
    };

    socketRef.current.emit('message:send', msg);
    setMessages(prev => [...prev, {
      from: user.id,
      fromUsername: user.username,
      ...msg,
      timestamp: Date.now()
    }]);

    setText('');
    setTyping(false);
    socketRef.current.emit('typing:stop', { to: target.id });

    socketRef.current.emit('notify', {
      to: target.id,
      title: 'رسالة جديدة',
      body: `${user.username}: ${text.trim().slice(0, 50)}`
    });
  };

  const sendVoice = async (blob, duration) => {
    try {
      const formData = new FormData();
      formData.append('audio', blob, `voice_${Date.now()}.webm`);
      
      const { data } = await axios.post('/api/users/upload/voice', formData);
      
      const msg = {
        to: target.id,
        type: 'voice',
        url: data.url,
        duration
      };

      socketRef.current.emit('voice:send', msg);
      setMessages(prev => [...prev, {
        from: user.id,
        fromUsername: user.username,
        ...msg,
        timestamp: Date.now()
      }]);
    } catch (error) {
      console.error('Voice upload error:', error);
    }
  };

  const sendSticker = (stickerName) => {
    if (!target || !socketRef.current) return;

    const msg = {
      to: target.id,
      type: 'sticker',
      sticker: stickerName
    };

    socketRef.current.emit('sticker:send', msg);
    setMessages(prev => [...prev, {
      from: user.id,
      fromUsername: user.username,
      ...msg,
      timestamp: Date.now()
    }]);

    setShowStickers(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!target) {
    return (
      <div className="empty-chat-telegram">
        <div className="empty-icon">
          <Icon name="MessageSquare" size={80} />
        </div>
        <h2>اختر محادثة للبدء</h2>
        <p>اختر مستخدماً من القائمة لبدء المحادثة</p>
      </div>
    );
  }

  return (
    <main className="chat-main-telegram">
      {/* Chat Header */}
      <div className="chat-header-telegram">
        <div className="chat-header-info">
          <div className="chat-avatar">
            <Icon name="User" size={24} />
          </div>
          <div className="chat-user-details">
            <h3 className="chat-username">{target.username}</h3>
            <span className="chat-status">
              {typing ? 'يكتب...' : 'متصل'}
            </span>
          </div>
        </div>
        <div className="chat-header-actions">
          <button className="header-action-btn" onClick={onCall} title="مكالمة صوتية">
            <Icon name="Phone" size={20} />
          </button>
          <button className="header-action-btn" title="معلومات">
            <Icon name="Info" size={20} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="messages-container">
        {loading ? (
          <div className="loading-messages">
            <div className="loading-spinner-small" />
          </div>
        ) : (
          <>
            {messages.length === 0 ? (
              <div className="no-messages">
                <Icon name="MessageCircle" size={48} />
                <p>لا توجد رسائل بعد</p>
                <small>ابدأ المحادثة بإرسال رسالة</small>
              </div>
            ) : (
              messages.map((msg, index) => (
                <Message 
                  key={msg.id || index} 
                  msg={msg} 
                  me={user.id} 
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      {recording ? (
        <VoiceRecorder
          onStop={(blob, duration) => {
            sendVoice(blob, duration);
            setRecording(false);
          }}
          onCancel={() => setRecording(false)}
        />
      ) : (
        <div className="chat-input-telegram">
          <button 
            className="attach-button"
            onClick={() => setShowStickers(!showStickers)}
            title="ستيكرز"
          >
            <Icon name="Smile" size={24} />
          </button>

          <div className="input-wrapper">
            <input
              type="text"
              className="message-input"
              placeholder="اكتب رسالة..."
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyPress}
              disabled={!target}
            />
          </div>

          {text.trim() ? (
            <button 
              className="send-button"
              onClick={sendMessage}
              title="إرسال"
            >
              <Icon name="Send" size={22} />
            </button>
          ) : (
            <button 
              className="voice-button"
              onClick={() => setRecording(true)}
              title="رسالة صوتية"
            >
              <Icon name="Mic" size={24} />
            </button>
          )}

          {showStickers && (
            <StickerPicker onSelect={sendSticker} />
          )}
        </div>
      )}
    </main>
  );
}