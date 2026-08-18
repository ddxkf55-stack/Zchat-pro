import { useState, useEffect } from 'react';
import Icon from './Icon.jsx';
import axios from 'axios';

export default function InfoPanel({ 
  user, currentUser, onClose,
  onAddToContacts, onAddToFavorites,
  onRemoveFromContacts, onRemoveFromFavorites
}) {
  const [status, setStatus] = useState({ inContacts: false, inFavorites: false });

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { data } = await axios.get(`/api/users/status/${user.id}`);
        setStatus(data);
      } catch {}
    };
    if (user.id) fetchStatus();
  }, [user.id]);

  return (
    <div className="info-panel-modern">
      <div className="info-header">
        <h3>معلومات الاتصال</h3>
        <button className="close-btn" onClick={onClose}><Icon name="X" size={20} /></button>
      </div>

      <div className="info-profile">
        <div className="profile-avatar-large">
          {user.avatar ? <img src={user.avatar} alt={user.username} /> : (
            <div className="avatar-placeholder-large">{user.username.charAt(0).toUpperCase()}</div>
          )}
        </div>
        <h2 className="profile-name-large">{user.username}</h2>
        <p className="profile-status-large">متصل الآن</p>
        {user.bio && <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px' }}>{user.bio}</p>}
        
        <div className="profile-actions" style={{ marginTop: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {status.inContacts ? (
            <button className="profile-action-btn" onClick={() => onRemoveFromContacts(user.id)}>
              <Icon name="UserMinus" size={18} />
              <span>إزالة من جهات الاتصال</span>
            </button>
          ) : (
            <button className="profile-action-btn" onClick={() => onAddToContacts(user.id)}>
              <Icon name="UserPlus" size={18} />
              <span>إضافة لجهات الاتصال</span>
            </button>
          )}
          {status.inFavorites ? (
            <button className="profile-action-btn" onClick={() => onRemoveFromFavorites(user.id)}>
              <Icon name="Star" size={18} />
              <span>إزالة من المفضلة</span>
            </button>
          ) : (
            <button className="profile-action-btn" onClick={() => onAddToFavorites(user.id)}>
              <Icon name="Star" size={18} />
              <span>إضافة للمفضلة</span>
            </button>
          )}
        </div>
      </div>

      <div className="info-section" style={{ marginTop: '24px' }}>
        <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
          <Icon name="Settings" size={18} />
          <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)' }}>الإعدادات</h4>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button className="setting-item" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: 'none', background: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', width: '100%', fontFamily: 'Tajawal' }}>
            <Icon name="Bell" size={18} />
            <span>الإشعارات</span>
          </button>
          <button className="setting-item" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: 'none', background: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', width: '100%', fontFamily: 'Tajawal' }}>
            <Icon name="Shield" size={18} />
            <span>الخصوصية</span>
          </button>
        </div>
      </div>
    </div>
  );
}