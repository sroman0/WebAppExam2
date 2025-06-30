import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import Layout from './components/Layout';
import IngredientList from './components/IngredientList';
import OrderConfigurator from './components/OrderConfigurator';
import OrderHistory from './components/OrderHistory';
import OrderDetails from './components/OrderDetails';
import LoginForm from './components/LoginForm';
import DishList from './components/DishList';
import NavigationBar from './components/NavigationBar';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function App() {
  const [user, setUser] = useState(null);

  return user ? (
    <>
      <NavigationBar />
      <Container className="mt-4">
        <Layout>
          <Routes>
            <Route path="/" element={<DishList />} />
            <Route path="/ingredients" element={<IngredientList />} />
            <Route path="/order" element={<OrderConfigurator />} />
            <Route path="/orders" element={<OrderHistory />} />
            <Route path="/orders/:id" element={<OrderDetails />} />
            <Route path="/login" element={<LoginForm onLogin={setUser} />} />
          </Routes>
        </Layout>
      </Container>
    </>
  ) : (
    <LoginForm onLogin={setUser} />
  );
}

export default App;
