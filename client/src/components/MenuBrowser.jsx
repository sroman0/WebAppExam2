import { useState, useEffect } from 'react';
import { Row, Col, Card, Badge, ListGroup, Button } from 'react-bootstrap';
import API from '../API';

function MenuBrowser({ showMessage }) {
  const [dishes, setDishes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);

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
        <Card className="h-100 border-0 shadow-lg" style={{ borderRadius: '15px' }}>
          <Card.Header className="text-white border-0" style={{ 
            background: 'linear-gradient(90deg, #ff4757 0%, #ff6b6b 100%)', 
            borderRadius: '15px 15px 0 0' 
          }}>
            <h5 className="mb-0 fw-bold">
              <i className="bi bi-grid-3x3-gap-fill me-2"></i>
              Base Dishes
            </h5>
          </Card.Header>
          <Card.Body className="p-4">
            <Row>
              {dishes.map(dish => (
                <Col md={4} key={dish.id} className="mb-3">
                  <Card className="text-center border-2" style={{ borderRadius: '10px', borderColor: '#ff6b6b' }}>
                    <Card.Body className="p-3">
                      <div className="mb-2">
                        <i className={`bi ${dish.name === 'pizza' ? 'bi-circle' : dish.name === 'pasta' ? 'bi-egg-fried' : 'bi-flower1'} display-6`} 
                           style={{ color: '#ff4757' }}></i>
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
        <Card className="h-100 border-0 shadow-lg" style={{ borderRadius: '15px' }}>
          <Card.Header className="text-white border-0" style={{ 
            background: 'linear-gradient(90deg, #ff4757 0%, #ff6b6b 100%)', 
            borderRadius: '15px 15px 0 0' 
          }}>
            <h5 className="mb-0 fw-bold">
              <i className="bi bi-plus-circle-fill me-2"></i>
              Available Ingredients
            </h5>
          </Card.Header>
          <Card.Body className="p-4" style={{ maxHeight: '500px', overflowY: 'auto' }}>
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
