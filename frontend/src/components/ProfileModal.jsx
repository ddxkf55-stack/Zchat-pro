import { useState, useRef } from 'react';
import axios from 'axios';
import Icon from './Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProfileModal({ onClose }) {
  const { user, updateUser } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('حجم الصورة يجب أن يكون أقل من 5MB');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const { data } = await axios.post('/api/users/upload/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAvatar(data.avatar);
      updateUser({ avatar: data.avatar, ...data.user });
      setSuccess('تم تحديث الصورة بنجاح');
    } catch (err) {
      setError(err.response?.data?.error || 'فشل رفع الصورة');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (username.length < 3) {
      setError('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.put('/api/users/profile', { username, bio });
      updateUser(data.user);
      setSuccess('تم حفظ التغييرات');
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'فشل الحفظ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>تعديل البروفايل</h2>
          <button className="modal-close" onClick={onClose}><Icon name="X" size={24} /></button>
        </div>
        <div className="modal-body">
          {error && <div className="alert-error">{error}</div>}
          {success && <div className="alert-success">{success}</div>}
          <div className="avatar-section">
            <div className="avatar-preview">
              {avatar ? <img src={`${avatar}?t=${Date.now()}`} alt="avatar" /> : <Icon name="User" size={64} />}
            </div>
            <button className="avatar-upload-btn" onClick={() => fileInputRef.current?.click()} disabled={loading}>
              <Icon name="Camera" size={18} />
              تغيير الصورة
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
          </div>
          <div className="form-group">
            <label><Icon name="User" size={16} /> اسم المستخدم</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} disabled={loading} />
          </div>
          <div className="form-group">
            <label><Icon name="FileText" size={16} /> نبذة عنك</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows="3" disabled={loading} placeholder="اكتب نبذة قصيرة عنك..." />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={loading}>إلغاء</button>
          <button className="btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? <><div className="spinner-small" /> جاري الحفظ...</> : <><Icon name="Check" size={18} /> حفظ التغييرات</>}
          </button>
        </div>
      </div>
    </div>
  );
}