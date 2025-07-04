import { useState, useEffect } from 'react';
import { Row, Col, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';

import LoginForm from './LoginForm';
import MenuBrowser from './MenuBrowser';
import OrderConfigurator from './OrderConfigurator';
import OrderHistory from './OrderHistory';

//------------------------------------------------------------------------
// --- Not Found Layout ---
function NotFoundLayout() {
  return (
    <Row className="justify-content-center mt-5">
      <Col xs={12} md={8} className="text-center">
        <div className="card shadow-lg border-0 card-transparent">
          <div className="card-body p-5">
            <h2 className="text-danger mb-4 fw-bold">404 - Page Not Found</h2>
            <p className="lead text-muted mb-4">
              Sorry, the page you are looking for doesn't exist.
            </p>
            <div className="d-flex gap-3 justify-content-center flex-wrap">
              <Link to="/">
                <Button 
                  variant="primary" 
                  size="lg" 
                  className="rounded-pill"
                >
                  <i className="bi bi-house-fill me-2"></i>
                  Go to Menu
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Col>
    </Row>
  );
}

//------------------------------------------------------------------------
// --- Login Layout ---
function LoginLayout({ onLogin, totpRequired, onTotp, onSkipTotp }) {
  return (
    <Row className="justify-content-center">
      <Col xs={12} sm={10} md={8} lg={5}>
        <div className="card shadow-lg border-0 card-transparent">
          <div className="card-body">
            <LoginForm 
              onLogin={onLogin} 
              totpRequired={totpRequired} 
              onTotp={onTotp}
              onSkipTotp={onSkipTotp}
            />
          </div>
        </div>
      </Col>
    </Row>
  );
}

//------------------------------------------------------------------------
// --- Menu Layout ---
function MenuLayout({ user, showMessage }) {
  const navigate = useNavigate();

  return (
    <div>
      {/* Welcome Section */}
      <Row className="mb-4 page-header">
        <Col>
          <div className="card border-0 shadow-lg card-transparent">
            <div className="card-body p-4 text-center">
              <h2 className="fw-bold mb-3 text-primary-custom">
                <i className="bi bi-shop me-2"></i>
                Welcome to Our Restaurant
              </h2>
              <p className="lead text-muted mb-4">
                Discover our delicious dishes and customize them with your favorite ingredients!
              </p>
              {user ? (
                <div className="d-flex gap-3 justify-content-center flex-wrap">
                  <Button 
                    variant="primary" 
                    size="lg"
                    onClick={() => navigate('/order')}
                    className="btn-gradient-primary"
                  >
                    <i className="bi bi-cart-plus me-2"></i>
                    Start Your Order
                  </Button>
                  <Button 
                    variant="outline-primary" 
                    size="lg"
                    onClick={() => navigate('/orders')}
                    className="btn-outline-primary-custom"
                  >
                    <i className="bi bi-clock-history me-2"></i>
                    View My Orders
                  </Button>
                </div>
              ) : (
                <div className="d-flex gap-3 justify-content-center flex-wrap">
                  <Button 
                    variant="primary" 
                    size="lg"
                    onClick={() => navigate('/login')}
                    className="btn-gradient-primary"
                  >
                    <i className="bi bi-box-arrow-in-right me-2"></i>
                    Login to Order
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* Menu Browser */}
      <MenuBrowser showMessage={showMessage} />
    </div>
  );
}

//------------------------------------------------------------------------
// --- Order Layout ---
function OrderLayout({ user, showMessage }) {
  const navigate = useNavigate();

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  // Don't render if user is not authenticated
  if (!user) {
    return null; // Will redirect via useEffect
  }

  const handleOrderComplete = () => {
    navigate('/orders');
  };

  return (
    <div>
      {/* Header */}
      <Row className="mb-4 page-header">
        <Col>
          <div className="card border-0 shadow-lg card-transparent">
            <div className="card-body p-4 text-center">
              <h2 className="fw-bold mb-2 text-primary-custom">
                <i className="bi bi-cart-plus me-2"></i>
                Configure Your Order
              </h2>
              <p className="text-muted mb-0">
                Select your base dish, size, and add your favorite ingredients!
              </p>
            </div>
          </div>
        </Col>
      </Row>

      {/* Order Configurator */}
      <OrderConfigurator 
        user={user} 
        showMessage={showMessage} 
        onOrderComplete={handleOrderComplete}
      />
    </div>
  );
}

//------------------------------------------------------------------------
// --- Order History Layout ---
function OrderHistoryLayout({ user, showMessage }) {
  const navigate = useNavigate();

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  // Don't render if user is not authenticated
  if (!user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div>
      {/* Header */}
      <Row className="mb-4 page-header">
        <Col>
          <div className="card border-0 shadow-lg card-transparent">
            <div className="card-body p-4 text-center">
              <h2 className="fw-bold mb-2 text-primary-custom">
                <i className="bi bi-clock-history me-2"></i>
                Your Order History
              </h2>
              <p className="text-muted mb-0">
                View and manage your past orders
                {user?.isTotp && <span className="text-success"> • 2FA enabled - you can cancel orders</span>}
              </p>
            </div>
          </div>
        </Col>
      </Row>

      {/* Order History */}
      <OrderHistory user={user} showMessage={showMessage} />
    </div>
  );
}

//------------------------------------------------------------------------
export { NotFoundLayout, LoginLayout, MenuLayout, OrderLayout, OrderHistoryLayout };
export default MenuLayout;
