import { useState, useEffect } from 'react';
import { Row, Col, Card, Badge, ListGroup, Button } from 'react-bootstrap';
import API from '../API';

function MenuBrowser({ showMessage }) {
  const [dishes, setDishes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);

  //----------------------------------------------------------------------------
  // Load menu data on component mount
  // This effect runs when the component mounts or when showMessage changes
  // It fetches dishes and ingredients from the API to display the restaurant menu
  useEffect(() => {
    const loadMenuData = async () => {
      try {
        const [dishesData, ingredientsData] = await Promise.all([
          API.getDishes(),
          API.getIngredients()
        ]);
        setDishes(dishesData);
        setIngredients(ingredientsData);
      } catch (error) {
        showMessage('Error loading menu data');
      } finally {
        setLoading(false);
      }
    };

    loadMenuData();
  }, [showMessage]);

  //----------------------------------------------------------------------------
  // Refresh ingredients when page becomes visible (for multi-client updates)
  useEffect(() => {
    const refreshIngredients = async () => {
      if (loading) return;
      
      try {
        const updatedIngredients = await API.getIngredients();
        setIngredients(updatedIngredients);
      } catch (error) {
        console.log('Error refreshing ingredients:', error);
      }
    };

    // Set up a visibility change listener
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshIngredients();
      }
    };

    // Set up periodic refresh every 15 seconds for real-time updates
    const refreshInterval = setInterval(() => {
      if (!document.hidden) {
        refreshIngredients();
      }
    }, 15000);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(refreshInterval);
    };
  }, [loading]);



  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3 text-muted">Loading menu...</p>
      </div>
    );
  }

  return (
    <Row>
      {/* Base Dishes */}
      <Col md={6} className="mb-4">
        <Card className="h-100 border-0 shadow-lg rounded-4">
          <Card.Header className="text-white border-0 card-header-gradient">
            <h5 className="mb-0 fw-bold">
              <i className="bi bi-grid-3x3-gap-fill me-2"></i>
              Base Dishes
            </h5>
          </Card.Header>
          <Card.Body className="p-4">
            <Row>
              {dishes.map(dish => (
                <Col md={4} key={dish.id} className="mb-3">
                  <Card className="text-center dish-card">
                    <Card.Body className="p-3">
                      <div className="mb-2">
                        <i className={`bi ${dish.name === 'Pizza' ? 'bi-circle' : dish.name === 'Pasta' ? 'bi-egg-fried' : 'bi-flower1'} display-6 text-primary-custom`}></i>
                      </div>
                      <h6 className="fw-bold text-capitalize">{dish.name}</h6>
                      <div className="mt-2">
                        <Badge bg="success" className="me-1">Small: €5</Badge>
                        <Badge bg="warning" className="me-1">Medium: €7</Badge>
                        <Badge bg="danger">Large: €9</Badge>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card.Body>
        </Card>
      </Col>

      {/* Ingredients */}
      <Col md={6} className="mb-4">
        <Card className="h-100 border-0 shadow-lg rounded-4">
          <Card.Header className="text-white border-0 card-header-gradient">
            <h5 className="mb-0 fw-bold">
              <i className="bi bi-plus-circle-fill me-2"></i>
              Available Ingredients
            </h5>
          </Card.Header>
          <Card.Body className="p-4 card-body-scrollable-menu">
            <ListGroup variant="flush">
              {ingredients.map(ingredient => (
                <ListGroup.Item key={ingredient.id} className="border-0 px-0">
                  <Row className="align-items-center">
                    <Col>
                      <div className="d-flex align-items-center">
                        <strong className="text-capitalize">{ingredient.name}</strong>
                        <Badge bg="primary" className="ms-2">€{ingredient.price.toFixed(2)}</Badge>
                        {ingredient.availability !== null && (
                          <Badge 
                            bg={ingredient.availability > 0 ? "success" : "danger"} 
                            className="ms-1"
                          >
                            {ingredient.availability > 0 ? `${ingredient.availability} left` : 'Out of stock'}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Show constraints */}
                      {(ingredient.requires?.length > 0 || ingredient.incompatible?.length > 0) && (
                        <div className="mt-2">
                          {ingredient.requires?.length > 0 && (
                            <div className="small text-success">
                              <i className="bi bi-check-circle me-1"></i>
                              Requires: {ingredient.requires.join(', ')}
                            </div>
                          )}
                          {ingredient.incompatible?.length > 0 && (
                            <div className="small text-danger">
                              <i className="bi bi-x-circle me-1"></i>
                              Incompatible with: {ingredient.incompatible.join(', ')}
                            </div>
                          )}
                        </div>
                      )}
                    </Col>
                  </Row>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}

export default MenuBrowser;
