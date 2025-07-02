import { useState } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

function LoginForm({ onLogin, showTotpChoice, totpRequired, onTotp, onSkipTotp, onChooseTotp }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();

  // Handle form submission for login or TOTP verification
  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      if (totpRequired) {
        await onTotp(totpCode);
      } else {
        await onLogin({ username, password });
      }
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear error message when user starts typing
  const handleUsernameChange = (e) => {
    setUsername(e.target.value);
    if (errorMessage) setErrorMessage('');
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (errorMessage) setErrorMessage('');
  };

  const handleTotpChange = (e) => {
    setTotpCode(e.target.value);
    if (errorMessage) setErrorMessage('');
  };

  return (
    <div className="p-4">
      <div className="text-center mb-4">
        <i className="bi bi-person-circle display-4 text-primary"></i>
        <h3 className="mt-3 fw-bold" style={{ color: '#ff4757' }}>
          {totpRequired ? 'Two-Factor Authentication' : 
           showTotpChoice ? 'Enhanced Security' : 
           'Welcome Back'}
        </h3>
        <p className="text-muted">
          {totpRequired 
            ? 'Enter your TOTP code to complete login' 
            : showTotpChoice
            ? 'Would you like to enable two-factor authentication for enhanced security?'
            : 'Sign in to your account to make orders'
          }
        </p>
      </div>

      {errorMessage && (
        <Alert variant="danger" className="mb-3" style={{ borderRadius: '10px' }}>
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {errorMessage}
        </Alert>
      )}

      <Form onSubmit={handleSubmit}>
        {!showTotpChoice && !totpRequired ? (
          <>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Username</Form.Label>
              <Form.Control
                type="text"
                value={username}
                onChange={handleUsernameChange}
                placeholder="Enter your username"
                required
                disabled={isLoading}
                className="border-0 shadow-sm"
                style={{ borderRadius: '10px', padding: '12px 16px', background: '#f8fafc' }}
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="fw-bold">Password</Form.Label>
              <Form.Control
                type="password"
                value={password}
                onChange={handlePasswordChange}
                placeholder="Enter your password"
                required
                disabled={isLoading}
                className="border-0 shadow-sm"
                style={{ borderRadius: '10px', padding: '12px 16px', background: '#f8fafc' }}
              />
            </Form.Group>
          </>
        ) : showTotpChoice ? (
          <div className="text-center mb-4">
            <div className="mb-4 p-4" style={{ background: '#f8fafc', borderRadius: '15px' }}>
              <i className="bi bi-shield-check display-6 text-success mb-3"></i>
              <h5 className="fw-bold mb-3">Secure Your Account</h5>
              <p className="text-muted">
                Two-factor authentication adds an extra layer of security to your account.
                You can use an authenticator app like Google Authenticator or Authy.
              </p>
            </div>
          </div>
        ) : (
          <Form.Group className="mb-4">
            <Form.Label className="fw-bold">TOTP Code</Form.Label>
            <Form.Control
              type="text"
              value={totpCode}
              onChange={handleTotpChange}
              placeholder="Enter 6-digit code"
              maxLength={6}
              required
              disabled={isLoading}
              className="border-0 shadow-sm text-center"
              style={{ 
                borderRadius: '10px', 
                padding: '12px 16px', 
                background: '#f8fafc',
                fontSize: '1.2rem',
                letterSpacing: '0.3rem'
              }}
            />
          </Form.Group>
        )}

        <div className="d-grid gap-2">
          {showTotpChoice ? (
            <>
              <Button 
                onClick={() => onChooseTotp(true)}
                size="lg"
                disabled={isLoading}
                className="fw-bold border-0 shadow-sm"
                style={{ 
                  borderRadius: '10px',
                  background: 'linear-gradient(90deg, #28a745 0%, #34d058 100%)',
                  padding: '12px'
                }}
              >
                <i className="bi bi-shield-check me-2"></i>
                Yes, Enable 2FA
              </Button>
              
              <Button 
                variant="outline-secondary"
                onClick={() => onChooseTotp(false)}
                disabled={isLoading}
                size="lg"
                className="fw-bold"
                style={{ borderRadius: '10px', padding: '12px' }}
              >
                <i className="bi bi-arrow-right me-2"></i>
                No, Continue Without 2FA
              </Button>
            </>
          ) : (
            <>
              <Button 
                type="submit" 
                size="lg"
                disabled={isLoading}
                className="fw-bold border-0 shadow-sm"
                style={{ 
                  borderRadius: '10px',
                  background: 'linear-gradient(90deg, #ff4757 0%, #ff6b6b 100%)',
                  padding: '12px'
                }}
              >
                {isLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    {totpRequired ? 'Verifying...' : 'Signing in...'}
                  </>
                ) : (
                  <>
                    <i className={`bi ${totpRequired ? 'bi-shield-check' : 'bi-box-arrow-in-right'} me-2`}></i>
                    {totpRequired ? 'Verify Code' : 'Sign In'}
                  </>
                )}
              </Button>

              {totpRequired && (
                <Button 
                  variant="outline-secondary"
                  onClick={onSkipTotp}
                  disabled={isLoading}
                  style={{ borderRadius: '10px' }}
                >
                  <i className="bi bi-skip-forward me-2"></i>
                  Skip 2FA (Limited Access)
                </Button>
              )}
            </>
          )}

          <Button 
            variant="link" 
            onClick={() => navigate('/')}
            className="text-decoration-none"
            style={{ color: '#ff4757' }}
          >
            <i className="bi bi-arrow-left me-1"></i>
            Back to Menu
          </Button>
        </div>
      </Form>
    </div>
  );
}

export default LoginForm;
