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

  // Handle login
  async function handleLogin(credentials) {
    try {
      const res = await API.logIn(credentials);
      if (res.canDoTotp) {
        setTotpRequired(true);
        setPendingUser(res.user);
        setMessage('');
      } else {
        setUser(res.user);
        setMessage('');
        navigate('/');
      }
    } catch (err) {
      setUser(null);
      setTotpRequired(false);
      setPendingUser(null);
      setMessage('');
      throw new Error(err.error || 'Login failed. Please check your credentials.');
    }
  }

  // Handle TOTP verification
  async function handleTotp(code) {
    try {
      await API.logInTotp(code);
      const u = await API.getUserInfo();
      setUser(u);
      setTotpRequired(false);
      setPendingUser(null);
      setMessage('');
      navigate('/');
    } catch (err) {
      throw new Error(err.error || 'Invalid TOTP code. Please try again.');
    }
  }

  // Handle skipping TOTP
  async function handleSkipTotp() {
    if (pendingUser) {
      setUser({ ...pendingUser, isTotp: false });
      setTotpRequired(false);
      setPendingUser(null);
      setMessage('');
      navigate('/');
    }
  }

  // Handle logout
  async function handleLogout() {
    await API.logOut();
    setUser(null);
    setTotpRequired(false);
    setPendingUser(null);
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
    <div className="min-vh-100" style={{ background: 'linear-gradient(135deg, #ff6b6b 0%, #ffa500 50%, #ff4757 100%)' }}>
      <NavigationBar user={user} onLogout={handleLogout} />
      
      <Container fluid className="px-3 py-4" style={{ paddingTop: '120px', minHeight: '100vh' }}>
        {message && (
          <Alert variant={messageType} className="mb-4 shadow-sm" style={{ borderRadius: '15px' }}>
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
  );
}

export default App;
