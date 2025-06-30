import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Button, ListGroup, Form, Alert, Spinner } from 'react-bootstrap';
import API from '../API';

// OrderConfigurator.jsx
// UI for configuring a new order (dish, size, ingredients)

export default function OrderConfigurator() {
  const [dishes, setDishes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [selectedDish, setSelectedDish] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const dishesData = await API.getDishes();
        const ingredientsData = await API.getIngredients();
        setDishes(dishesData);
        setIngredients(ingredientsData);
      } catch (err) {
        setError('Failed to load menu data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    // Calculate total price
    let base = 0;
    if (selectedDish && selectedSize) {
      const sizeObj = selectedDish.sizes.find(s => s.name === selectedSize);
      base = sizeObj ? sizeObj.price : 0;
    }
    const ingTotal = selectedIngredients.reduce((sum, ingId) => {
      const ing = ingredients.find(i => i.id === ingId);
      return sum + (ing ? ing.price : 0);
    }, 0);
    setTotal(base + ingTotal);
  }, [selectedDish, selectedSize, selectedIngredients, ingredients]);

  const handleDishSelect = (dish) => {
    setSelectedDish(dish);
    setSelectedSize(null);
    setSelectedIngredients([]);
    setError('');
  };

  const handleSizeSelect = (size) => {
    if (selectedIngredients.length > size.maxIngredients) {
      setError(`Reduce ingredients to ${size.maxIngredients} or fewer before changing to ${size.name}.`);
      return;
    }
    setSelectedSize(size.name);
    setError('');
  };

  const handleIngredientToggle = (ingId) => {
    // Add/remove ingredient, respecting constraints (to be implemented in detail)
    if (selectedIngredients.includes(ingId)) {
      setSelectedIngredients(selectedIngredients.filter(id => id !== ingId));
    } else {
      // Check max ingredients for size
      const max = selectedDish && selectedSize ? selectedDish.sizes.find(s => s.name === selectedSize).maxIngredients : 0;
      if (selectedIngredients.length >= max) {
        setError(`Maximum ${max} ingredients allowed for ${selectedSize}.`);
        return;
      }
      setSelectedIngredients([...selectedIngredients, ingId]);
    }
    setError('');
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await API.submitOrder({
        dishId: selectedDish.id,
        size: selectedSize,
        ingredients: selectedIngredients
      });
      // Redirect or show success (to be implemented)
    } catch (err) {
      setError(err.message || 'Order submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner animation="border" className="mt-5" />;

  return (
    <Row>
      <Col md={5}>
        <h4>Ingredients</h4>
        <ListGroup>
          {ingredients.map(ing => (
            <ListGroup.Item key={ing.id} action active={selectedIngredients.includes(ing.id)} onClick={() => handleIngredientToggle(ing.id)} disabled={!selectedDish || !selectedSize || (ing.availability !== null && ing.availability <= 0)}>
              {ing.name} (€{ing.price.toFixed(2)})
              {ing.availability !== null && (
                <span className="ms-2 text-muted">({ing.availability} left)</span>
              )}
            </ListGroup.Item>
          ))}
        </ListGroup>
      </Col>
      <Col md={7}>
        <h4>Order Configuration</h4>
        {error && <Alert variant="danger">{error}</Alert>}
        <Card className="mb-3">
          <Card.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Base Dish</Form.Label>
                <div>
                  {dishes.map(dish => (
                    <Button key={dish.id} variant={selectedDish && selectedDish.id === dish.id ? 'primary' : 'outline-primary'} className="me-2 mb-2" onClick={() => handleDishSelect(dish)}>{dish.name}</Button>
                  ))}
                </div>
              </Form.Group>
              {selectedDish && (
                <Form.Group className="mb-3">
                  <Form.Label>Size</Form.Label>
                  <div>
                    {selectedDish.sizes.map(size => (
                      <Button key={size.name} variant={selectedSize === size.name ? 'success' : 'outline-success'} className="me-2 mb-2" onClick={() => handleSizeSelect(size)}>{size.name} (€{size.price})</Button>
                    ))}
                  </div>
                </Form.Group>
              )}
              <div className="d-flex justify-content-between align-items-center">
                <strong>Total Price: €{total.toFixed(2)}</strong>
                <Button variant="success" disabled={!selectedDish || !selectedSize || selectedIngredients.length === 0 || submitting} onClick={handleSubmit}>
                  {submitting ? 'Submitting...' : 'Submit Order'}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <h5>Selected Ingredients</h5>
            <ul>
              {selectedIngredients.map(id => {
                const ing = ingredients.find(i => i.id === id);
                return ing ? <li key={id}>{ing.name} (€{ing.price.toFixed(2)})</li> : null;
              })}
            </ul>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}
