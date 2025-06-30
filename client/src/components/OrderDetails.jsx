import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, ListGroup, Spinner, Alert, Button } from 'react-bootstrap';
import API from '../API';

// OrderDetails.jsx
// Shows details for a single order (dishes, size, ingredients, price)

export default function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await API.getOrderDetails(id);
        setOrder(data);
      } catch (err) {
        setError('Failed to load order details.');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  if (loading) return <Spinner animation="border" className="mt-5" />;
  if (error) return <Alert variant="danger">{error}</Alert>;
  if (!order) return <Alert variant="warning">Order not found.</Alert>;

  return (
    <Card>
      <Card.Header>
        <h4>Order Details</h4>
      </Card.Header>
      <Card.Body>
        <p><strong>Dish:</strong> {order.dishName}</p>
        <p><strong>Size:</strong> {order.size}</p>
        <p><strong>Date:</strong> {new Date(order.date).toLocaleString()}</p>
        <p><strong>Total Price:</strong> €{order.total.toFixed(2)}</p>
        <h5>Ingredients</h5>
        <ListGroup>
          {order.ingredients.map(ing => (
            <ListGroup.Item key={ing.id}>
              {ing.name} (€{ing.price.toFixed(2)})
            </ListGroup.Item>
          ))}
        </ListGroup>
        {/* Optionally, add cancel button if user has 2FA */}
        {order.canCancel && (
          <Button variant="danger" className="mt-3" onClick={() => API.cancelOrder(order.id)}>
            Cancel Order
          </Button>
        )}
      </Card.Body>
    </Card>
  );
}
