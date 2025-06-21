import { useEffect, useState } from 'react';
import LoginForm from './components/LoginForm';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [ingredients, setIngredients] = useState([]);

  useEffect(() => {
    if (user) {
      fetch('http://localhost:3001/api/dishes').then(res => res.json()).then(setDishes);
      fetch('http://localhost:3001/api/ingredients').then(res => res.json()).then(data => {
        setIngredients(data.ingredients);
      });
    }
  }, [user]);

  if (!user) return <LoginForm onLogin={setUser} />;

  return (
    <div>
      <h2>Welcome {user.username}</h2>
      <h3>Dishes</h3>
      <ul>
        {dishes.map(d => <li key={d.id}>{d.name}</li>)}
      </ul>
      <h3>Ingredients</h3>
      <ul>
        {ingredients.map(i => <li key={i.id}>{i.name} ({i.price})</li>)}
      </ul>
    </div>
  );
}

export default App;
