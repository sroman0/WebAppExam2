import { useState, useEffect } from 'react';
import { Row, Col, Card, Badge, ListGroup, Button, Form, Modal, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import API from '../API';

function OrderConfigurator({ user, showMessage, onOrderComplete }) {
  // State variables
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

  //----------------------------------------------------------------------------
  // Load dishes and ingredients data on component mount
  // This effect runs when the component mounts or when user, navigate, or showMessage changes
  // It redirects unauthenticated users and loads menu data for order configuration
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

  //----------------------------------------------------------------------------
  // Refresh ingredients data when component becomes visible
  // This ensures users see updated availability when navigating between pages
  useEffect(() => {
    const refreshIngredients = async () => {
      if (!user || loading) return;
      
      try {
        const updatedIngredients = await API.getIngredients();
        setIngredients(updatedIngredients);
        
        // Check if any selected ingredients are no longer available and remove them
        const stillAvailableIngredients = selectedIngredients.filter(selectedId => {
          const ingredient = updatedIngredients.find(ing => ing.id === selectedId);
          return !ingredient || ingredient.availability === null || ingredient.availability > 0;
        });
        
        if (stillAvailableIngredients.length !== selectedIngredients.length) {
          setSelectedIngredients(stillAvailableIngredients);
          const removedCount = selectedIngredients.length - stillAvailableIngredients.length;
          showMessage(`${removedCount} ingredient(s) were removed due to availability changes`, 'info');
        }
      } catch (error) {
        console.log('Error refreshing ingredients:', error);
      }
    };

    // Set up a visibility change listener to refresh when page becomes visible
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
    
    // Also refresh when component mounts (after initial load)
    if (!loading && ingredients.length > 0) {
      refreshIngredients();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(refreshInterval);
    };
  }, [user, loading, selectedIngredients, ingredients.length, showMessage]);



  // Calculate total price
  const getTotalPrice = () => {
    const basePrice = sizeInfo[selectedSize].price;
    const ingredientsPrice = selectedIngredients.reduce((sum, id) => {
      const ingredient = ingredients.find(i => i.id === id);
      return sum + (ingredient ? ingredient.price : 0);
    }, 0);
    return basePrice + ingredientsPrice;
  };

  // Recursively add required ingredients
  const addRequiredIngredients = (ingredientId, currentIngredients, visited = new Set()) => {
    // Prevent infinite loops
    if (visited.has(ingredientId)) {
      return currentIngredients;
    }
    visited.add(ingredientId);

    const ingredient = ingredients.find(i => i.id === ingredientId);
    if (!ingredient) return currentIngredients;

    // Add the ingredient itself if not already present
    if (!currentIngredients.includes(ingredientId)) {
      currentIngredients.push(ingredientId);
    }

    // Check if this ingredient has requirements
    if (ingredient.requires && ingredient.requires.length > 0) {
      for (const requiredName of ingredient.requires) {
        const requiredIngredient = ingredients.find(i => i.name === requiredName);
        if (requiredIngredient) {
          // Recursively add required ingredients
          currentIngredients = addRequiredIngredients(requiredIngredient.id, currentIngredients, visited);
        }
      }
    }

    return currentIngredients;
  };

  // Check if ingredient can be added (considering recursive dependencies)
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

    // Calculate total ingredients needed (including recursive dependencies)
    let tempIngredients = [...selectedIngredients];
    tempIngredients = addRequiredIngredients(ingredientId, tempIngredients);
    
    // Check if adding all required ingredients exceeds the limit
    if (tempIngredients.length > sizeInfo[selectedSize].maxIngredients) {
      return false;
    }

    // Check availability for all ingredients that would be added
    const ingredientsToAdd = tempIngredients.filter(id => !selectedIngredients.includes(id));
    for (const newIngId of ingredientsToAdd) {
      const ing = ingredients.find(i => i.id === newIngId);
      if (ing && ing.availability !== null && ing.availability <= 0) {
        return false;
      }
    }

    // Check incompatibilities for the main ingredient
    /*if (ingredient.incompatible) {
      for (const incompatible of ingredient.incompatible) {
        const incompatibleId = ingredients.find(i => i.name === incompatible)?.id;
        if (incompatibleId && selectedIngredients.includes(incompatibleId)) {
          return false;
        }
      }
    }*/
   // Removed incompatibility check - allow users to select incompatible ingredients
   // Server will validate and return error on order submission

    return true;
  };

  // Get all ingredients that would be added (for display purposes)
  const getIngredientsToAdd = (ingredientId) => {
    let tempIngredients = [...selectedIngredients];
    tempIngredients = addRequiredIngredients(ingredientId, tempIngredients);
    const ingredientsToAdd = tempIngredients.filter(id => !selectedIngredients.includes(id));
    return ingredientsToAdd.map(id => ingredients.find(i => i.id === id)?.name).filter(Boolean);
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
       // Removed incompatibility check - let server handle validation
        
        
        setConstraintError(error);
        return;
      }

      // Use recursive function to add all required ingredients
      let newIngredients = [...selectedIngredients];
      newIngredients = addRequiredIngredients(ingredientId, newIngredients);
      
      // Check if adding all required ingredients exceeds the limit
      if (newIngredients.length > sizeInfo[selectedSize].maxIngredients) {
        const ingredient = ingredients.find(i => i.id === ingredientId);
        const requiredCount = newIngredients.length - selectedIngredients.length;
        setConstraintError(
          `Cannot add ${ingredient.name}: it requires ${requiredCount - 1} additional ingredients ` +
          `(${newIngredients.length - selectedIngredients.length} total), but only ${sizeInfo[selectedSize].maxIngredients - selectedIngredients.length} slots available`
        );
        return;
      }

      // Check availability for all new ingredients
      const ingredientsToAdd = newIngredients.filter(id => !selectedIngredients.includes(id));
      for (const newIngId of ingredientsToAdd) {
        const ing = ingredients.find(i => i.id === newIngId);
        if (ing && ing.availability !== null && ing.availability <= 0) {
          setConstraintError(`Cannot add required ingredient ${ing.name}: out of stock`);
          return;
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

  // Handle order submission confirmation with pre-check
  const handleOrderSubmit = async () => {
    // First, refresh ingredients to ensure we have the latest availability
    try {
      const freshIngredients = await API.getIngredients();
      setIngredients(freshIngredients);
      
      // Check if any selected ingredients are no longer available
      const unavailableIngredients = [];
      const stillAvailableIngredients = [];
      
      for (const selectedId of selectedIngredients) {
        const ingredient = freshIngredients.find(ing => ing.id === selectedId);
        if (ingredient && ingredient.availability !== null && ingredient.availability <= 0) {
          unavailableIngredients.push(ingredient.name);
        } else {
          stillAvailableIngredients.push(selectedId);
        }
      }
      
      // If some ingredients became unavailable, update selection and warn user
      if (unavailableIngredients.length > 0) {
        setSelectedIngredients(stillAvailableIngredients);
        showMessage(`The following ingredients became unavailable and were removed: ${unavailableIngredients.join(', ')}. Please review your order and try again.`, 'warning');
        return;
      }
      
      // All ingredients are still available, proceed with confirmation
      setShowConfirm(true);
    } catch (error) {
      showMessage('Error checking ingredient availability. Please try again.', 'danger');
    }
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
      
      await API.addOrder(order);
      showMessage('Order submitted successfully!', 'success');
      setShowConfirm(false);
      
      if (onOrderComplete) {
        onOrderComplete();
      } else {
        navigate('/orders');
      }
    } catch (error) {
      // Handle order failure - refresh ingredients and provide detailed feedback
      try {
        // Refresh ingredients data to get updated availability
        const updatedIngredients = await API.getIngredients();
        setIngredients(updatedIngredients);
        
        // Analyze which ingredients became unavailable
        const unavailableIngredients = [];
        const stillAvailableIngredients = [];
        
        for (const selectedId of selectedIngredients) {
          const updatedIngredient = updatedIngredients.find(ing => ing.id === selectedId);
          if (updatedIngredient && updatedIngredient.availability !== null && updatedIngredient.availability <= 0) {
            unavailableIngredients.push(updatedIngredient.name);
          } else {
            stillAvailableIngredients.push(selectedId);
          }
        }
        
        // Update selected ingredients to remove unavailable ones
        if (unavailableIngredients.length > 0) {
          setSelectedIngredients(stillAvailableIngredients);
          
          // Create a detailed error message
          const errorMessage = error.error || 'Order failed due to ingredient availability';
          const detailMessage = `The following ingredients became unavailable and were removed from your order: ${unavailableIngredients.join(', ')}. Please review your selection and try again.`;
          
          showMessage(`${errorMessage}. ${detailMessage}`, 'warning');
        } else {
          // No ingredients were unavailable, show original error
          showMessage(error.error || 'Error submitting order', 'danger');
        }
      } catch (refreshError) {
        // If refresh fails, just show the original error
        showMessage(error.error || 'Error submitting order. Please try refreshing the page.', 'danger');
      }
      
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
          <Card className="h-100 border-0 shadow-lg rounded-4">
            <Card.Header className="text-white border-0 card-header-gradient">
              <h5 className="mb-0 fw-bold">
                <i className="bi bi-plus-circle-fill me-2"></i>
                Available Ingredients
              </h5>
            </Card.Header>
            <Card.Body className="p-4 card-body-scrollable">
              {constraintError && (
                <Alert variant="warning" className="mb-3 rounded-3">
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
                              
                              {/* Show what will be added automatically */}
                              {!isSelected && canAdd && (
                                (() => {
                                  const ingredientsToAdd = getIngredientsToAdd(ingredient.id);
                                  if (ingredientsToAdd.length > 1) {
                                    return (
                                      <div className="mt-1">
                                        <div className="small text-info">
                                          <i className="bi bi-plus-circle me-1"></i>
                                          Will also add: {ingredientsToAdd.filter(name => name !== ingredient.name).join(', ')}
                                        </div>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()
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
          <div className="position-sticky sticky-order-summary">
            {/* Total Price */}
            <Card className="mb-3 border-0 shadow-lg rounded-4">
              <Card.Body className="text-center p-4 card-body-success-gradient">
                <h3 className="text-white mb-0 fw-bold">
                  <i className="bi bi-currency-euro me-2"></i>
                  Total: €{getTotalPrice().toFixed(2)}
                </h3>
              </Card.Body>
            </Card>

            {/* Order Configuration */}
            <Card className="border-0 shadow-lg rounded-4">
              <Card.Header className="text-white border-0 card-header-gradient">
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
                    className="rounded-3"
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
                        className="flex-fill rounded-3"
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
                    onClick={handleOrderSubmit}
                    disabled={!selectedDish}
                    className="fw-bold border-0 shadow-sm btn-gradient-primary"
                  >
                    <i className="bi bi-cart-check me-2"></i>
                    Submit Order
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </div>
        </Col>
      </Row>

      {/* Confirmation Modal */}
      <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
        <Modal.Header closeButton className="modal-header-gradient-danger">
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
          <Button variant="outline-secondary" onClick={() => setShowConfirm(false)} className="rounded-pill">
            Cancel
          </Button>
          <Button 
            variant="success" 
            onClick={handleSubmitOrder}
            disabled={submitting}
            className="rounded-pill"
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
