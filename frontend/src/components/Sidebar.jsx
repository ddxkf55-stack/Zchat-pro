import Icon from './Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Sidebar({ 
  users, selected, onSelect, onLogout, onProfileClick,
  searchTerm, onSearchChange, activeTab, onTabChange,
  contactsCount, favoritesCount
}) {
  const { user } = useAuth();

  return (
    <div className="sidebar-modern">
      <div className="sidebar-header">
        <div className="logo-section">
          <div className="logo-icon"><Icon name="MessageSquare" size={24} /></div>
          <h1 className="app-title">تطبيق المحادثة</h1>
        </div>
      </div>

      <div className="search-section">
        <div className="search-box-modern">
          <Icon name="Search" size={18} />
          <input
            type="text"
            placeholder="ابحث في المحادثات..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="search-input-modern"
          />
        </div>
      </div>

      <div className="nav-tabs">
        <button className={`nav-tab ${activeTab === 'chats' ? 'active' : ''}`} onClick={() => onTabChange('chats')}>
          <Icon name="MessageSquare" size={18} />
          <span>المحادثات</span>
        </button>
        <button className={`nav-tab ${activeTab === 'contacts' ? 'active' : ''}`} onClick={() => onTabChange('contacts')}>
          <Icon name="Users" size={18} />
          <span>جهات الاتصال</span>
          {contactsCount > 0 && <span className="badge">{contactsCount}</span>}
        </button>
        <button className={`nav-tab ${activeTab === 'favorites' ? 'active' : ''}`} onClick={() => onTabChange('favorites')}>
          <Icon name="Star" size={18} />
          <span>المفضلة</span>
          {favoritesCount > 0 && <span className="badge">{favoritesCount}</span>}
        </button>
      </div>

      <div className="conversations-list">
        {users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <Icon name="Inbox" size={48} />
            <p style={{ marginTop: '12px' }}>
              {activeTab === 'contacts' ? 'لا توجد جهات اتصال' : 
               activeTab === 'favorites' ? 'لا توجد مفضلة' : 'لا توجد محادثات'}
            </p>
          </div>
        ) : (
          users.map((u) => (
            <div
              key={u.id}
              className={`conversation-item ${selected?.id === u.id ? 'active' : ''}`}
              onClick={() => onSelect(u)}
            >
              <div className="conversation-avatar">
                {u.avatar ? <img src={u.avatar} alt={u.username} /> : (
                  <div className="avatar-placeholder">{u.username.charAt(0).toUpperCase()}</div>
                )}
                <span className="online-indicator"></span>
              </div>
              <div className="conversation-info">
                <div className="conversation-header">
                  <h3 className="conversation-name">{u.username}</h3>
                  <span className="conversation-time">الآن</span>
                </div>
                <p className="conversation-preview">اضغط لبدء المحادثة...</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="user-profile-footer" onClick={onProfileClick}>
        <div className="profile-avatar">
          {user?.avatar ? <img src={user.avatar} alt="profile" /> : (
            <div className="avatar-placeholder">{user?.username?.charAt(0).toUpperCase()}</div>
          )}
        </div>
        <div className="profile-info">
          <span className="profile-name">{user?.username}</span>
          <span className="profile-status">متصل</span>
        </div>
        <button className="logout-btn" onClick={(e) => { e.stopPropagation(); onLogout(); }}>
          <Icon name="LogOut" size={18} />
        </button>
      </div>
    </div>
  );
}