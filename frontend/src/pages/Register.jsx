import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Icon from '../components/Icon.jsx';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (username.length < 3) {
      setError('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      setLoading(false);
      return;
    }

    const result = await register(username, password);
    if (!result.success) setError(result.error);
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-logo">
          <div className="logo-circle">
            <Icon name="UserPlus" size={48} />
          </div>
          <h1 className="auth-title">إنشاء حساب جديد</h1>
          <p className="auth-subtitle">انضم إلينا الآن</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <div className="error-message">
              <Icon name="AlertCircle" size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="input-group">
            <label className="input-label">
              <Icon name="User" size={16} />
              اسم المستخدم
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="اختر اسم مستخدم"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <small className="input-hint">3 أحرف على الأقل</small>
          </div>

          <div className="input-group">
            <label className="input-label">
              <Icon name="Lock" size={16} />
              كلمة المرور
            </label>
            <input
              type="password"
              className="input-field"
              placeholder="اختر كلمة مرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <small className="input-hint">6 أحرف على الأقل</small>
          </div>

          <div className="input-group">
            <label className="input-label">
              <Icon name="Lock" size={16} />
              تأكيد كلمة المرور
            </label>
            <input
              type="password"
              className="input-field"
              placeholder="أعد إدخال كلمة المرور"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? (
              <>
                <div className="spinner-small" />
                جاري الإنشاء...
              </>
            ) : (
              <>
                <Icon name="CheckCircle" size={18} />
                إنشاء الحساب
              </>
            )}
          </button>

          <div className="auth-footer">
            <span>لديك حساب بالفعل؟</span>
            <Link to="/login" className="auth-link">
              تسجيل الدخول
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}