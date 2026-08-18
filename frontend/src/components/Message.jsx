import Icon from './Icon.jsx';

export default function Message({ msg, me }) {
  const mine = msg.from === me;
  const time = new Date(msg.timestamp).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`message ${mine ? 'mine' : 'other'}`}>
      {!mine && (
        <div className="message-avatar">
          {msg.fromUsername?.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="message-bubble">
        {!mine && <div className="message-sender">{msg.fromUsername}</div>}
        
        {msg.type === 'text' && <div className="message-content">{msg.content}</div>}
        
        {msg.type === 'voice' && (
          <div className="voice-message">
            <button className="voice-play-btn">
              <Icon name="Play" size={16} />
            </button>
            <audio src={msg.url} controls style={{ maxWidth: '200px', height: '32px' }} />
            <span className="voice-duration">{msg.duration || 0}ث</span>
          </div>
        )}
        
        {msg.type === 'sticker' && (
          <img src={`/stickers/${msg.sticker}.svg`} alt="sticker" className="sticker-img" />
        )}
        
        <div className="message-time">{time}</div>
      </div>
    </div>
  );
}