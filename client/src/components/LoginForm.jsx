import { useState } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

function LoginForm({ onLogin, totpRequired, onTotp, onSkipTotp }) {
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
    setErrorMessage(''); // Clear any previous local errors

    // With centralized error handling, we don't need try/catch here
    // Errors are handled at the App level and displayed in the global message
    if (totpRequired) {
      await onTotp(totpCode);
    } else {
      await onLogin({ username, password });
    }
    
    setIsLoading(false);
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
        <h3 className="mt-3 fw-bold text-primary-custom">
          {totpRequired ? 'Two-Factor Authentication' : 'Welcome Back'}
        </h3>
        <p className="text-muted">
          {totpRequired 
            ? 'Enter your TOTP code to complete login, or skip for standard access' 
            : 'Sign in to your account to make orders'
          }
        </p>
      </div>

      {errorMessage && (
        <Alert variant="danger" className="mb-3 rounded-3">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {errorMessage}
        </Alert>
      )}

      <Form onSubmit={handleSubmit}>
        {!totpRequired ? (
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
                className="border-0 shadow-sm form-control-light rounded-3"
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
                className="border-0 shadow-sm form-control-light rounded-3"
              />
            </Form.Group>
          </>
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
              className="border-0 shadow-sm text-center form-control-light rounded-3 totp-input"
            />
          </Form.Group>
        )}

        <div className="d-grid gap-2">
          <Button 
            type="submit" 
            size="lg"
            disabled={isLoading}
            className="fw-bold border-0 shadow-sm btn-gradient-primary"
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
              className="rounded-3"
            >
              <i className="bi bi-skip-forward me-2"></i>
              Skip 2FA
            </Button>
          )}

          
        </div>
      </Form>
    </div>
  );
}

export default LoginForm;
