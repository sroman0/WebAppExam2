import React from 'react';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';

// NavigationBar.jsx
// Top navigation bar for the app

export default function NavigationBar() {
  return (
    <Navbar bg="dark" variant="dark" expand="lg" sticky="top">
      <Container>
        <Navbar.Brand href="/">Restaurant App</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <LinkContainer to="/">
              <Nav.Link>Dishes</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/ingredients">
              <Nav.Link>Ingredients</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/order">
              <Nav.Link>Order Configurator</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/orders">
              <Nav.Link>Order History</Nav.Link>
            </LinkContainer>
          </Nav>
          <Nav>
            <LinkContainer to="/login">
              <Nav.Link>Login</Nav.Link>
            </LinkContainer>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
