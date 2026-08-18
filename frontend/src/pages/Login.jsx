import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Icon from '../components/Icon.jsx';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
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

    const result = await login(username, password);
    if (!result.success) setError(result.error);
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-logo">
          <div className="logo-circle">
            <Icon name="MessageCircle" size={48} />
          </div>
          <h1 className="auth-title">تسجيل الدخول</h1>
          <p className="auth-subtitle">مرحباً بك في تطبيق المحادثة</p>
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
              placeholder="أدخل اسم المستخدم"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="input-group">
            <label className="input-label">
              <Icon name="Lock" size={16} />
              كلمة المرور
            </label>
            <input
              type="password"
              className="input-field"
              placeholder="أدخل كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? (
              <>
                <div className="spinner-small" />
                جاري الدخول...
              </>
            ) : (
              <>
                <Icon name="LogIn" size={18} />
                تسجيل الدخول
              </>
            )}
          </button>

          <div className="auth-footer">
            <span>ليس لديك حساب؟</span>
            <Link to="/register" className="auth-link">
              إنشاء حساب جديد
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}