import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { Container, Alert } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css';

import API from './API';
import NavigationBar from './components/NavigationBar';
import { MenuLayout, LoginLayout, OrderLayout, OrderHistoryLayout, NotFoundLayout } from './components/Layout';

function App() {
  // State management
  const [user, setUser] = useState(null);
  const [totpRequired, setTotpRequired] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('danger');

  const navigate = useNavigate();

  // Check session on mount
  useEffect(() => {
    API.getUserInfo()
      .then(u => setUser(u))
      .catch(() => setUser(null));
  }, []);

  // Handle login - following professor's pattern
  async function handleLogin(credentials) {
    try {
      const user = await API.logIn(credentials);
      // After successful login, user is logged in but may want to use TOTP
      if (user.canDoTotp) {
        setUser(user);
        setTotpRequired(true);
        setMessage('');
        // Don't navigate yet, show TOTP option
      } else {
        setUser(user);
        setMessage('');
        navigate('/');
      }
    } catch (err) {
      setUser(null);
      setTotpRequired(false);
      setMessage('');
      throw new Error(err.error || 'Login failed. Please check your credentials.');
    }
  }

  // Handle TOTP verification - following professor's pattern
  async function handleTotp(code) {
    try {
      await API.totpVerify(code);
      // After successful TOTP, get updated user info
      const u = await API.getUserInfo();
      setUser(u);
      setTotpRequired(false);
      setMessage('2FA authentication successful!', 'success');
      navigate('/');
    } catch (err) {
      throw new Error(err.error || 'Invalid TOTP code. Please try again.');
    }
  }

  // Handle skipping TOTP - user continues without 2FA
  async function handleSkipTotp() {
    try {
      // Simply proceed without TOTP verification
      setTotpRequired(false);
      setMessage('');
      navigate('/');
    } catch (err) {
      throw new Error('Failed to continue. Please try again.');
    }
  }

  // Handle logout
  async function handleLogout() {
    await API.logOut();
    setUser(null);
    setTotpRequired(false);
    setMessage('');
    navigate('/login');
  }

  // Global message handler
  const showMessage = (msg, type = 'danger') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  return (
    <div className="min-vh-100 app-background">
      <NavigationBar user={user} onLogout={handleLogout} />
      
      <div className="main-content">
        <Container fluid className="px-3 py-4">
          {message && (
            <Alert variant={messageType} className="mb-4 shadow-sm rounded-4">
              {message}
            </Alert>
          )}
          
          <Routes>
            <Route path="/login" element={
              <LoginLayout 
                user={user}
                onLogin={handleLogin} 
                totpRequired={totpRequired} 
                onTotp={handleTotp} 
                onSkipTotp={handleSkipTotp}
              />
            } />
            <Route path="/order" element={
              <OrderLayout 
                user={user} 
                showMessage={showMessage} 
              />
            } />
            <Route path="/orders" element={
              <OrderHistoryLayout 
                user={user} 
                showMessage={showMessage} 
              />
            } />
            <Route path="/" element={
              <MenuLayout 
                user={user} 
                showMessage={showMessage} 
              />
            } />
            <Route path="*" element={<NotFoundLayout />} />
          </Routes>
        </Container>
      </div>
    </div>
  );
}

export default App;
