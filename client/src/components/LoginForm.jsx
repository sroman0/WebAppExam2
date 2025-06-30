import React, { useState } from 'react';
import { Form, Button, Alert, Spinner, Card } from 'react-bootstrap';
import API from '../API';

export default function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [showTotp, setShowTotp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await API.login({ username, password, totp });
      if (result.require2FA) {
        setShowTotp(true);
      } else {
        onLogin(result);
      }
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mx-auto" style={{ maxWidth: 400 }}>
      <Card.Body>
        <h3 className="mb-3">Login</h3>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="formUsername">
            <Form.Label>Username</Form.Label>
            <Form.Control
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoFocus
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="formPassword">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </Form.Group>
          {showTotp && (
            <Form.Group className="mb-3" controlId="formTotp">
              <Form.Label>2FA Code (TOTP)</Form.Label>
              <Form.Control
                type="text"
                value={totp}
                onChange={e => setTotp(e.target.value)}
                required
                maxLength={6}
              />
            </Form.Group>
          )}
          <Button variant="primary" type="submit" disabled={loading} className="w-100">
            {loading ? <Spinner size="sm" animation="border" /> : 'Login'}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
}
