// -----------------------------------------------------------------------------
// Restaurant App Component
// -----------------------------------------------------------------------------
// This file defines the main App component, which serves as the root of the
// restaurant application. It manages the state of the application, handles 
// authentication with TOTP support, and defines routes for navigation.
// -----------------------------------------------------------------------------

import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Container, Alert } from 'react-bootstrap';
import API from './API';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css';

import NavigationBar from './components/NavigationBar';
import { MenuLayout, LoginLayout, OrderLayout, OrderHistoryLayout, NotFoundLayout } from './components/Layout';

//----------------------------------------------------------------------------
function App() {

  //----------------------------------------------------------------------------
  // State management using React hooks
  // React hooks are functions that let you use state and other React features
  // in functional components. They allow you to manage component state, side effects,
  // and context without needing to convert your component to a class.
  // This application uses several hooks to manage the state of the user, TOTP requirements,
  // pending user data, and global messages.

  // User information
  const [user, setUser] = useState(null);
  // If TOTP is required for the user
  const [totpRequired, setTotpRequired] = useState(false);
  // Pending user data (for TOTP verification)
  const [pendingUser, setPendingUser] = useState(null);
  // Global message to display to the user (e.g., success or error messages)
  const [message, setMessage] = useState('');
  // Type of message to display (success, warning, danger)
  const [messageType, setMessageType] = useState('danger');

  const navigate = useNavigate();

  //----------------------------------------------------------------------------
  // Centralized error handling
  // This function handles all errors in a consistent way, providing proper
  // error message formatting and automatic logout for authentication errors
  const handleErrors = (err) => {
    //console.log('DEBUG: err: '+JSON.stringify(err));
    let msg = '';
    if (err.error)
      msg = err.error;
    else if (err.errors) {
      if (err.errors[0].msg)
        msg = err.errors[0].msg + " : " + err.errors[0].path;
    } else if (Array.isArray(err))
      msg = err[0].msg + " : " + err[0].path;
    else if (typeof err === "string") msg = String(err);
    else msg = "Unknown Error";

    setMessage(msg); // WARNING: a more complex application requires a queue of messages. In this example only the last error is shown.
    setMessageType('danger');

    if (msg === 'Not authenticated')
      setTimeout(() => {  // do logout in the app state
        setUser(null); setTotpRequired(false); setPendingUser(null);
        navigate('/login');
      }, 2000);
    else
      setTimeout(() => setMessage(''), 4000);  // Clear message after a while
  }

  //----------------------------------------------------------------------------
  // Check session on mount
  // This effect runs once when the component mounts to check if the user is logged in
  // this is given by the fact that there is no value inside the dependencies array
  useEffect(() => {
    API.getUserInfo()
      .then(u => setUser(u))
      .catch(() => setUser(null));
  }, []);

  //----------------------------------------------------------------------------
  // Handle user login
  // If the user can do TOTP check, then we set the state to require TOTP
  // and store the pending user data for later verification.
  async function handleLogin(credentials) {
    try {
      const res = await API.logIn(credentials);
      if (res.canDoTotp) {
        setTotpRequired(true);
        setPendingUser(res);
        setUser(null); // Clear user during TOTP flow
      } else {
        setUser({ ...res, isTotp: false });
        setTotpRequired(false);
        setPendingUser(null);
        navigate('/');
      }
      setMessage('');
    } catch (err) {
      setUser(null);
      setTotpRequired(false);
      setPendingUser(null);
      // Use centralized error handling instead of throwing
      handleErrors(err);
    }
  }

  //-----------------------------------------------------------------------------
  // Handle TOTP verification
  async function handleTotp(code) {
    try {
      await API.totpVerify(code);
      const u = await API.getUserInfo();
      setUser(u);
      setTotpRequired(false);
      setPendingUser(null);
      setMessage('');
      navigate('/');
    } catch (err) {
      // Use centralized error handling instead of throwing
      handleErrors(err);
    }
  }

  //-----------------------------------------------------------------------------
  // Handle skipping TOTP for pending user
  async function handleSkipTotp() {
    if (pendingUser) {
      setUser({ 
        ...pendingUser, 
        isTotp: false,
        limitedAccess: true
      });
      setTotpRequired(false);
      setPendingUser(null);
      setMessage('Logged in without 2FA. Complete 2FA for enhanced security.');
      setMessageType('warning');
      setTimeout(() => setMessage(''), 4000);
      navigate('/');
    }
  }

  //-----------------------------------------------------------------------------
  // Handle user logout
  async function handleLogout() {
    await API.logOut();
    setUser(null);
    setTotpRequired(false);
    setPendingUser(null);
    setMessage('');
    navigate('/login');
  }

  //-----------------------------------------------------------------------------
  // Global message handler - Enhanced to work with centralized error handling
  const showMessage = (msg, type = 'danger') => {
    // If msg is an error object, use centralized error formatting
    if (typeof msg === 'object' && (msg.error || msg.errors)) {
      handleErrors(msg);
      return;
    }
    
    // Otherwise, handle as a simple string message
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  //############################################################################
  // --- Routing ---
  return (
    <div className="min-vh-100 app-background">
      <NavigationBar user={user} onLogout={handleLogout} />
      
      <div className="main-content">
        <Container fluid className="px-3 py-4">
          {message && (
            <Alert 
              variant={messageType} 
              className="mb-4 shadow-sm rounded-4 border-0"
              onClose={() => setMessage('')} 
              dismissible
            >
              <i className={`bi ${messageType === 'success' ? 'bi-check-circle-fill' : messageType === 'warning' ? 'bi-exclamation-triangle-fill' : 'bi-exclamation-triangle-fill'} me-2`}></i>
              {message}
            </Alert>
          )}
          
          <Routes>
            <Route 
              path="/login" 
              element={
                <LoginWithTotp 
                  user={user}
                  totpRequired={totpRequired}
                  onLogin={handleLogin} 
                  onTotp={handleTotp} 
                  onSkipTotp={handleSkipTotp}
                />
              } 
            />
            <Route 
              path="/order" 
              element={
                user ? (
                  <OrderLayout 
                    user={user} 
                    showMessage={showMessage} 
                  />
                ) : (
                  <Navigate to="/login" replace />
                )
              } 
            />
            <Route 
              path="/orders" 
              element={
                user ? (
                  <OrderHistoryLayout 
                    user={user} 
                    showMessage={showMessage} 
                  />
                ) : (
                  <Navigate to="/login" replace />
                )
              } 
            />
            <Route 
              path="/" 
              element={
                <MenuLayout 
                  user={user} 
                  showMessage={showMessage} 
                />
              } 
            />
            <Route path="*" element={<NotFoundLayout />} />
          </Routes>
        </Container>
      </div>
    </div>
  );
}

//----------------------------------------------------------------------------
// LoginWithTotp Component - Following Professor's Pattern
// This component handles the logic for redirecting authenticated users
// and managing the TOTP flow properly
//----------------------------------------------------------------------------
function LoginWithTotp({ user, totpRequired, onLogin, onTotp, onSkipTotp }) {
  if (user) {
    // User is authenticated
    if (user.canDoTotp && totpRequired) {
      // User can do TOTP and TOTP is required - show TOTP form
      return (
        <LoginLayout 
          onLogin={onLogin} 
          totpRequired={totpRequired} 
          onTotp={onTotp} 
          onSkipTotp={onSkipTotp}
        />
      );
    } else {
      // User is fully authenticated - redirect to home
      return <Navigate to="/" replace />;
    }
  } else {
    // User is not authenticated - show login form
    return (
      <LoginLayout 
        onLogin={onLogin} 
        totpRequired={totpRequired} 
        onTotp={onTotp} 
        onSkipTotp={onSkipTotp}
      />
    );
  }
}

//----------------------------------------------------------------------------
export default App;
