import { useState, useRef, useEffect } from 'react';
import Icon from './Icon.jsx';
import Message from './Message.jsx';
import VoiceRecorder from './VoiceRecorder.jsx';
import StickerPicker from './StickerPicker.jsx';
import axios from 'axios';

export default function ChatArea({ 
  user, selected, messages, onSendMessage, onCall,
  onToggleInfo, showInfoPanel,
  onAddToContacts, onAddToFavorites,
  onRemoveFromContacts, onRemoveFromFavorites
}) {
  const [inputText, setInputText] = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage(inputText.trim(), 'text');
      setInputText('');
      setShowStickers(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceStop = async (blob, duration) => {
    setSending(true);
    try {
      const formData = new FormData();
      formData.append('audio', blob, `voice_${Date.now()}.webm`);
      const { data } = await axios.post('/api/users/upload/voice', formData);
      onSendMessage({ url: data.url, duration }, 'voice');
    } catch (err) {
      console.error('Voice upload error:', err);
    }
    setSending(false);
    setRecording(false);
  };

  if (!selected) {
    return (
      <div className="chat-area-empty">
        <div className="empty-state-modern">
          <div className="empty-icon"><Icon name="MessageSquare" size={64} /></div>
          <h2>مرحباً بك في تطبيق المحادثة</h2>
          <p>اختر محادثة من القائمة للبدء</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-area-modern">
      <div className="chat-header-modern">
        <div className="chat-user-info">
          <div className="chat-avatar">
            {selected.avatar ? <img src={selected.avatar} alt={selected.username} /> : (
              <div className="avatar-placeholder">{selected.username.charAt(0).toUpperCase()}</div>
            )}
            <span className="online-indicator"></span>
          </div>
          <div className="chat-details">
            <h2 className="chat-username">{selected.username}</h2>
            <span className="chat-status">متصل الآن</span>
          </div>
        </div>
        <div className="chat-actions">
          <button className="action-btn" onClick={() => onAddToContacts(selected.id)} title="إضافة لجهات الاتصال">
            <Icon name="UserPlus" size={20} />
          </button>
          <button className="action-btn" onClick={() => onAddToFavorites(selected.id)} title="إضافة للمفضلة">
            <Icon name="Star" size={20} />
          </button>
          <button className="action-btn" onClick={onCall} title="مكالمة صوتية">
            <Icon name="Phone" size={20} />
          </button>
          <button className={`action-btn ${showInfoPanel ? 'active' : ''}`} onClick={onToggleInfo} title="معلومات">
            <Icon name="Info" size={20} />
          </button>
        </div>
      </div>

      <div className="messages-container-modern">
        {messages.length === 0 ? (
          <div className="no-messages"><p>ابدأ محادثتك مع {selected.username}</p></div>
        ) : (
          messages.map((msg, index) => <Message key={msg.id || index} msg={msg} me={user.id} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {recording ? (
        <VoiceRecorder onStop={handleVoiceStop} onCancel={() => setRecording(false)} />
      ) : (
        <div className="chat-input-modern">
          <div className="input-actions">
            <button className="input-btn" onClick={() => setShowStickers(!showStickers)} title="ستيكرز">
              <Icon name="Smile" size={20} />
            </button>
          </div>
          <div className="input-wrapper-modern">
            <input
              type="text"
              placeholder="اكتب رسالتك هنا..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              className="message-input-modern"
            />
          </div>
          <div className="input-actions-right">
            <button className="input-btn" onClick={() => setRecording(true)} title="رسالة صوتية">
              <Icon name="Mic" size={20} />
            </button>
            {inputText.trim() && (
              <button className="send-btn" onClick={handleSend} title="إرسال">
                <Icon name="Send" size={20} />
              </button>
            )}
          </div>
          {showStickers && <StickerPicker onSelect={(s) => { onSendMessage(s, 'sticker'); }} />}
        </div>
      )}

      {sending && (
        <div style={{ position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)', background: 'var(--primary)', color: 'white', padding: '8px 16px', borderRadius: '20px', fontSize: '13px' }}>
          جاري إرسال الرسالة الصوتية...
        </div>
      )}
    </div>
  );
}