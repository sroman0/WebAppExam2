import React, { useEffect, useState } from 'react';
import { Table, Spinner, Alert, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import API from '../API';

// OrderHistory.jsx
// Displays the user's past orders

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await API.getUserOrders();
        setOrders(data);
      } catch (err) {
        setError('Failed to load order history.');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  if (loading) return <Spinner animation="border" className="mt-5" />;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div>
      <h2>Order History</h2>
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>#</th>
            <th>Dish</th>
            <th>Size</th>
            <th>Ingredients</th>
            <th>Total Price (€)</th>
            <th>Date</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, idx) => (
            <tr key={order.id}>
              <td>{idx + 1}</td>
              <td>{order.dishName}</td>
              <td>{order.size}</td>
              <td>{order.ingredients.map(i => i.name).join(', ')}</td>
              <td>{order.total.toFixed(2)}</td>
              <td>{new Date(order.date).toLocaleString()}</td>
              <td>
                <Button size="sm" variant="info" onClick={() => navigate(`/orders/${order.id}`)}>
                  View
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
