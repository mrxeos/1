import React, { useState } from 'react';
import { login, saveRememberedUser } from '../services/settingsService';
import { User } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = await login(username, password);
      if (user) {
        if (rememberMe) {
          saveRememberedUser(user);
        }
        onLoginSuccess(user);
      } else {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة.');
      }
    } catch (err) {
      setError('حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.');
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">تطبيق عيادتي</h1>
          <p className="login-subtitle">مرحباً بك، يرجى تسجيل الدخول للمتابعة.</p>
        </div>
        <form className="login-form" onSubmit={handleLogin}>
          <div>
            <label htmlFor="username" className="input-label">
              اسم المستخدم
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="input"
            />
          </div>
          <div>
            <label htmlFor="password" className="input-label">
              كلمة المرور
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input"
            />
          </div>

          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="checkbox me-2 cursor-pointer"
            />
            <label htmlFor="remember-me" className="text-sm font-medium text-secondary cursor-pointer">
              تذكرني
            </label>
          </div>

          {error && <p className="error-text">{error}</p>}
          
          <div>
            <button
              type="submit"
              className="btn btn-primary w-full"
            >
              تسجيل الدخول
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;