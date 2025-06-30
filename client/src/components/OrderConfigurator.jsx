import { useState, useEffect } from 'react';
import { Row, Col, Card, Badge, ListGroup, Button, Form, Modal, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import API from '../API';

function OrderConfigurator({ user, showMessage, onOrderComplete }) {
  const [dishes, setDishes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [selectedDish, setSelectedDish] = useState(null);
  const [selectedSize, setSelectedSize] = useState('small');
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [constraintError, setConstraintError] = useState('');

  const navigate = useNavigate();

  const sizeInfo = {
    small: { price: 5, maxIngredients: 3 },
    medium: { price: 7, maxIngredients: 5 },
    large: { price: 9, maxIngredients: 7 }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const loadData = async () => {
      try {
        const [dishesData, ingredientsData] = await Promise.all([
          API.getDishes(),
          API.getIngredients()
        ]);
        setDishes(dishesData);
        setIngredients(ingredientsData);
        if (dishesData.length > 0) {
          setSelectedDish(dishesData[0]);
        }
      } catch (error) {
        showMessage('Error loading menu data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, navigate, showMessage]);

  // Calculate total price
  const getTotalPrice = () => {
    const basePrice = sizeInfo[selectedSize].price;
    const ingredientsPrice = selectedIngredients.reduce((sum, id) => {
      const ingredient = ingredients.find(i => i.id === id);
      return sum + (ingredient ? ingredient.price : 0);
    }, 0);
    return basePrice + ingredientsPrice;
  };

  // Check if ingredient can be added
  const canAddIngredient = (ingredientId) => {
    const ingredient = ingredients.find(i => i.id === ingredientId);
    if (!ingredient) return false;

    // Check availability
    if (ingredient.availability !== null && ingredient.availability <= 0) {
      return false;
    }

    // Check if already selected
    if (selectedIngredients.includes(ingredientId)) {
      return false;
    }

    // Check max ingredients for size
    if (selectedIngredients.length >= sizeInfo[selectedSize].maxIngredients) {
      return false;
    }

    // Check incompatibilities
    if (ingredient.incompatible) {
      for (const incompatible of ingredient.incompatible) {
        const incompatibleId = ingredients.find(i => i.name === incompatible)?.id;
        if (incompatibleId && selectedIngredients.includes(incompatibleId)) {
          return false;
        }
      }
    }

    return true;
  };

  // Check if ingredient can be removed
  const canRemoveIngredient = (ingredientId) => {
    const ingredient = ingredients.find(i => i.id === ingredientId);
    if (!ingredient) return false;

    // Check if it's required by other selected ingredients
    for (const selectedId of selectedIngredients) {
      if (selectedId === ingredientId) continue;
      const selectedIngredient = ingredients.find(i => i.id === selectedId);
      if (selectedIngredient?.requires?.includes(ingredient.name)) {
        return false;
      }
    }

    return true;
  };

  // Handle ingredient toggle
  const handleIngredientToggle = (ingredientId) => {
    setConstraintError('');
    
    if (selectedIngredients.includes(ingredientId)) {
      // Remove ingredient
      if (!canRemoveIngredient(ingredientId)) {
        const ingredient = ingredients.find(i => i.id === ingredientId);
        setConstraintError(`Cannot remove ${ingredient.name} as it's required by other ingredients`);
        return;
      }
      setSelectedIngredients(prev => prev.filter(id => id !== ingredientId));
    } else {
      // Add ingredient
      if (!canAddIngredient(ingredientId)) {
        const ingredient = ingredients.find(i => i.id === ingredientId);
        let error = '';
        
        if (ingredient.availability !== null && ingredient.availability <= 0) {
          error = `${ingredient.name} is out of stock`;
        } else if (selectedIngredients.length >= sizeInfo[selectedSize].maxIngredients) {
          error = `${selectedSize} size can only have ${sizeInfo[selectedSize].maxIngredients} ingredients`;
        } else if (ingredient.incompatible) {
          const conflicting = ingredient.incompatible.find(incompatible => {
            const incompatibleId = ingredients.find(i => i.name === incompatible)?.id;
            return incompatibleId && selectedIngredients.includes(incompatibleId);
          });
          if (conflicting) {
            error = `${ingredient.name} is incompatible with ${conflicting}`;
          }
        }
        
        setConstraintError(error);
        return;
      }

      // Check if we need to add required ingredients
      const ingredient = ingredients.find(i => i.id === ingredientId);
      let newIngredients = [...selectedIngredients, ingredientId];
      
      if (ingredient.requires) {
        for (const requiredName of ingredient.requires) {
          const requiredIngredient = ingredients.find(i => i.name === requiredName);
          if (requiredIngredient && !newIngredients.includes(requiredIngredient.id)) {
            if (newIngredients.length >= sizeInfo[selectedSize].maxIngredients) {
              setConstraintError(`Cannot add ${ingredient.name}: not enough space for required ingredients`);
              return;
            }
            newIngredients.push(requiredIngredient.id);
          }
        }
      }

      setSelectedIngredients(newIngredients);
    }
  };

  // Handle size change
  const handleSizeChange = (newSize) => {
    if (selectedIngredients.length > sizeInfo[newSize].maxIngredients) {
      setConstraintError(`Cannot change to ${newSize} size: too many ingredients selected`);
      return;
    }
    setConstraintError('');
    setSelectedSize(newSize);
  };

  // Handle order submission
  const handleSubmitOrder = async () => {
    setSubmitting(true);
    try {
      const order = {
        dish_id: selectedDish.id,
        size: selectedSize,
        ingredients: selectedIngredients
      };
      
      await API.createOrder(order);
      showMessage('Order submitted successfully!', 'success');
      setShowConfirm(false);
      
      if (onOrderComplete) {
        onOrderComplete();
      } else {
        navigate('/orders');
      }
    } catch (error) {
      showMessage(error.error || 'Error submitting order');
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3 text-muted">Loading order configurator...</p>
      </div>
    );
  }

  return (
    <>
      <Row>
        {/* Left Side - Ingredients List */}
        <Col lg={6} className="mb-4">
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
            <Card.Body className="p-4" style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {constraintError && (
                <Alert variant="warning" className="mb-3" style={{ borderRadius: '10px' }}>
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {constraintError}
                </Alert>
              )}
              
              <ListGroup variant="flush">
                {ingredients.map(ingredient => {
                  const isSelected = selectedIngredients.includes(ingredient.id);
                  const canAdd = canAddIngredient(ingredient.id);
                  const canRemove = canRemoveIngredient(ingredient.id);
                  
                  return (
                    <ListGroup.Item key={ingredient.id} className="border-0 px-0">
                      <Row className="align-items-center">
                        <Col>
                          <div className="d-flex align-items-center">
                            <Form.Check
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleIngredientToggle(ingredient.id)}
                              disabled={isSelected ? !canRemove : !canAdd}
                              className="me-3"
                            />
                            <div>
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
                              
                              {/* Show constraints */}
                              {(ingredient.requires?.length > 0 || ingredient.incompatible?.length > 0) && (
                                <div className="mt-1">
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
                            </div>
                          </div>
                        </Col>
                      </Row>
                    </ListGroup.Item>
                  );
                })}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>

        {/* Right Side - Order Configuration */}
        <Col lg={6} className="mb-4">
          <div className="position-sticky" style={{ top: '100px' }}>
            {/* Total Price */}
            <Card className="mb-3 border-0 shadow-lg" style={{ borderRadius: '15px' }}>
              <Card.Body className="text-center p-4" style={{ background: 'linear-gradient(90deg, #28a745 0%, #20c997 100%)', borderRadius: '15px' }}>
                <h3 className="text-white mb-0 fw-bold">
                  <i className="bi bi-currency-euro me-2"></i>
                  Total: €{getTotalPrice().toFixed(2)}
                </h3>
              </Card.Body>
            </Card>

            {/* Order Configuration */}
            <Card className="border-0 shadow-lg" style={{ borderRadius: '15px' }}>
              <Card.Header className="text-white border-0" style={{ 
                background: 'linear-gradient(90deg, #ff4757 0%, #ff6b6b 100%)', 
                borderRadius: '15px 15px 0 0' 
              }}>
                <h5 className="mb-0 fw-bold">
                  <i className="bi bi-gear-fill me-2"></i>
                  Your Order
                </h5>
              </Card.Header>
              <Card.Body className="p-4">
                {/* Dish Selection */}
                <div className="mb-4">
                  <Form.Label className="fw-bold">Base Dish</Form.Label>
                  <Form.Select 
                    value={selectedDish?.id || ''} 
                    onChange={(e) => setSelectedDish(dishes.find(d => d.id === parseInt(e.target.value)))}
                    style={{ borderRadius: '10px' }}
                  >
                    {dishes.map(dish => (
                      <option key={dish.id} value={dish.id}>
                        {dish.name.charAt(0).toUpperCase() + dish.name.slice(1)}
                      </option>
                    ))}
                  </Form.Select>
                </div>

                {/* Size Selection */}
                <div className="mb-4">
                  <Form.Label className="fw-bold">Size</Form.Label>
                  <div className="d-flex gap-2">
                    {Object.entries(sizeInfo).map(([size, info]) => (
                      <Button
                        key={size}
                        variant={selectedSize === size ? "primary" : "outline-primary"}
                        onClick={() => handleSizeChange(size)}
                        className="flex-fill"
                        style={{ borderRadius: '10px' }}
                      >
                        {size.charAt(0).toUpperCase() + size.slice(1)}<br/>
                        <small>€{info.price} (max {info.maxIngredients})</small>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Selected Ingredients */}
                <div className="mb-4">
                  <Form.Label className="fw-bold">
                    Selected Ingredients ({selectedIngredients.length}/{sizeInfo[selectedSize].maxIngredients})
                  </Form.Label>
                  {selectedIngredients.length === 0 ? (
                    <p className="text-muted">No ingredients selected</p>
                  ) : (
                    <div className="d-flex flex-wrap gap-2">
                      {selectedIngredients.map(id => {
                        const ingredient = ingredients.find(i => i.id === id);
                        return ingredient ? (
                          <Badge key={id} bg="secondary" className="p-2">
                            {ingredient.name} (€{ingredient.price.toFixed(2)})
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="d-grid">
                  <Button 
                    size="lg"
                    onClick={() => setShowConfirm(true)}
                    disabled={!selectedDish}
                    className="fw-bold border-0 shadow-sm"
                    style={{ 
                      borderRadius: '10px',
                      background: 'linear-gradient(90deg, #28a745 0%, #20c997 100%)',
                      padding: '12px'
                    }}
                  >
                    <i className="bi bi-cart-check me-2"></i>
                    Submit Order (€{getTotalPrice().toFixed(2)})
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </div>
        </Col>
      </Row>

      {/* Confirmation Modal */}
      <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
        <Modal.Header closeButton style={{ background: 'linear-gradient(90deg, #ff4757 0%, #ff6b6b 100%)', color: 'white', border: 'none' }}>
          <Modal.Title>
            <i className="bi bi-cart-check me-2"></i>
            Confirm Your Order
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <div className="mb-3">
            <strong>Dish:</strong> {selectedDish?.name} ({selectedSize})
          </div>
          <div className="mb-3">
            <strong>Ingredients:</strong>
            {selectedIngredients.length === 0 ? (
              <span className="text-muted"> None</span>
            ) : (
              <ul className="mb-0 mt-2">
                {selectedIngredients.map(id => {
                  const ingredient = ingredients.find(i => i.id === id);
                  return ingredient ? (
                    <li key={id}>{ingredient.name} (€{ingredient.price.toFixed(2)})</li>
                  ) : null;
                })}
              </ul>
            )}
          </div>
          <div className="border-top pt-3">
            <h5><strong>Total: €{getTotalPrice().toFixed(2)}</strong></h5>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button variant="outline-secondary" onClick={() => setShowConfirm(false)} style={{ borderRadius: '20px' }}>
            Cancel
          </Button>
          <Button 
            variant="success" 
            onClick={handleSubmitOrder}
            disabled={submitting}
            style={{ borderRadius: '20px' }}
          >
            {submitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Submitting...
              </>
            ) : (
              <>
                <i className="bi bi-check-lg me-1"></i>
                Confirm Order
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default OrderConfigurator;
