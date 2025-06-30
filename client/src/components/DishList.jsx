import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Spinner } from 'react-bootstrap';
import API from '../API';

// DishList.jsx
// Displays the list of base dishes (pizza, pasta, salad)

export default function DishList() {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDishes = async () => {
      try {
        const data = await API.getDishes();
        setDishes(data);
      } catch (err) {
        setDishes([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDishes();
  }, []);

  if (loading) return <Spinner animation="border" className="mt-5" />;

  return (
    <div>
      <h2>Base Dishes</h2>
      <Row>
        {dishes.map((dish) => (
          <Col key={dish.id} md={4} className="mb-4">
            <Card>
              <Card.Body>
                <Card.Title>{dish.name}</Card.Title>
                <Card.Text>
                  <strong>Available Sizes:</strong>
                  <ul>
                    {dish.sizes.map((size) => (
                      <li key={size.name}>
                        {size.name} - €{size.price}
                      </li>
                    ))}
                  </ul>
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
