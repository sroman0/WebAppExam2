import React, { useEffect, useState } from 'react';
import { Table, Spinner, Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import API from '../API';

// IngredientList.jsx
// Displays all available ingredients with prices, availability, and constraints

export default function IngredientList() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        const data = await API.getIngredients();
        setIngredients(data);
      } catch (err) {
        setIngredients([]);
      } finally {
        setLoading(false);
      }
    };
    fetchIngredients();
  }, []);

  if (loading) return <Spinner animation="border" className="mt-5" />;

  return (
    <div>
      <h2>Ingredients</h2>
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Name</th>
            <th>Price (€)</th>
            <th>Availability</th>
            <th>Dependencies</th>
            <th>Incompatibilities</th>
          </tr>
        </thead>
        <tbody>
          {ingredients.map((ing) => (
            <tr key={ing.id}>
              <td>{ing.name}</td>
              <td>{ing.price.toFixed(2)}</td>
              <td>
                {ing.availability !== null ? (
                  <Badge bg={ing.availability > 0 ? 'success' : 'danger'}>
                    {ing.availability}
                  </Badge>
                ) : (
                  <Badge bg="secondary">Unlimited</Badge>
                )}
              </td>
              <td>
                {ing.dependencies && ing.dependencies.length > 0 ? (
                  <ul className="mb-0">
                    {ing.dependencies.map((dep) => (
                      <li key={dep}>{dep}</li>
                    ))}
                  </ul>
                ) : (
                  <span>-</span>
                )}
              </td>
              <td>
                {ing.incompatibilities && ing.incompatibilities.length > 0 ? (
                  <OverlayTrigger
                    placement="top"
                    overlay={<Tooltip>Incompatible with: {ing.incompatibilities.join(', ')}</Tooltip>}
                  >
                    <span>
                      <Badge bg="warning" text="dark">
                        {ing.incompatibilities.length}
                      </Badge>
                    </span>
                  </OverlayTrigger>
                ) : (
                  <span>-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
