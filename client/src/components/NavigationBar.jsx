import { Navbar, Nav, Button, Container } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

function NavigationBar({ user, onLogout }) {
  const navigate = useNavigate();

  return (
    <Navbar 
      style={{ background: 'linear-gradient(90deg, #ff4757 0%, #ff6b6b 100%)' }} 
      variant="dark" 
      expand="lg" 
      fixed="top" 
      className="shadow-lg"
    >
      <Container>
        <Navbar.Brand href="/" className="fw-bold fs-4">
          <i className="bi bi-shop me-2"></i>
          Restaurant Menu
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link onClick={() => navigate('/')} className="text-light">
              <i className="bi bi-house-fill me-1"></i>
              Menu
            </Nav.Link>
            {user && (
              <>
                <Nav.Link onClick={() => navigate('/order')} className="text-light">
                  <i className="bi bi-cart-plus me-1"></i>
                  Make Order
                </Nav.Link>
                <Nav.Link onClick={() => navigate('/orders')} className="text-light">
                  <i className="bi bi-clock-history me-1"></i>
                  My Orders
                </Nav.Link>
              </>
            )}
          </Nav>
          <Nav className="ms-auto">
            {user ? (
              <>
                <Nav.Link disabled className="text-light me-3">
                  <i className="bi bi-person-circle me-1"></i>
                  Welcome, <span className="fw-bold">{user.name}</span>
                  {user.isTotp && <span className="badge bg-success text-dark ms-2">2FA</span>}
                </Nav.Link>
                <Button variant="outline-light" onClick={onLogout} style={{ borderRadius: '20px' }}>
                  <i className="bi bi-box-arrow-right me-1"></i>
                  Logout
                </Button>
              </>
            ) : (
              <Button variant="outline-light" onClick={() => navigate('/login')} style={{ borderRadius: '20px' }}>
                <i className="bi bi-box-arrow-in-right me-1"></i>
                Login
              </Button>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default NavigationBar;
