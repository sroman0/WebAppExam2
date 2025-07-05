import { useState, useEffect } from 'react';
import { Row, Col, Card, Badge, Button, Modal, ListGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import API from '../API';

function OrderHistory({ user, showMessage }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const navigate = useNavigate();

  //----------------------------------------------------------------------------
  // Load orders on component mount and redirect if not authenticated
  // This effect runs when the component mounts or when user, navigate, or showMessage changes
  // It checks authentication and loads the user's order history from the API
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const loadOrders = async () => {
      try {
        const ordersData = await API.getOrders();
        setOrders(ordersData);
      } catch (error) {
        showMessage('Error loading orders');
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [user, navigate, showMessage]);

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setShowDetails(true);
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder) return;

    setCancelling(true);
    try {
      await API.deleteOrder(selectedOrder.id);
      showMessage('Order cancelled successfully!', 'success');
      
      // Refresh orders
      const ordersData = await API.getOrders();
      setOrders(ordersData);
      
      setShowCancelConfirm(false);
      setShowDetails(false);
      setSelectedOrder(null);
    } catch (error) {
      showMessage(error.error || 'Error cancelling order');
    } finally {
      setCancelling(false);
    }
  };

  const getOrderTotal = (order) => {
    const sizePrice = { small: 5, medium: 7, large: 9 }[order.size] || 0;
    const ingredientsPrice = order.ingredients?.reduce((sum, ing) => sum + ing.price, 0) || 0;
    return sizePrice + ingredientsPrice;
  };

  const canCancelOrder = (order) => {
    return user?.isTotp && order.status === 'confirmed';
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
        <p className="mt-3 text-muted">Loading your orders...</p>
      </div>
    );
  }

  return (
    <>
      <Row>
        <Col>
          <Card className="border-0 shadow-lg rounded-4">
            <Card.Header className="text-white border-0 card-header-gradient">
              <h5 className="mb-0 fw-bold">
                <i className="bi bi-clock-history me-2"></i>
                Your Order History
              </h5>
            </Card.Header>
            <Card.Body className="p-4">
              {orders.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-cart-x display-4 text-muted"></i>
                  <h6 className="mt-3 text-muted">No orders yet</h6>
                  <p className="text-muted">Start by making your first order!</p>
                  <Button 
                    variant="primary" 
                    onClick={() => navigate('/order')}
                    className="rounded-pill"
                  >
                    <i className="bi bi-cart-plus me-2"></i>
                    Make an Order
                  </Button>
                </div>
              ) : (
                <Row>
                  {orders.map(order => (
                    <Col md={6} lg={4} key={order.id} className="mb-4">
                      <Card className="h-100 dish-card">
                        <Card.Body className="p-3">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <Badge 
                              bg={order.status === 'confirmed' ? 'success' : order.status === 'cancelled' ? 'danger' : 'warning'}
                              className="text-capitalize"
                            >
                              {order.status}
                            </Badge>
                            <small className="text-muted">
                              Order #{order.id}
                            </small>
                          </div>
                          
                          <h6 className="fw-bold text-capitalize mb-2">
                            {order.dish_name} ({order.size})
                          </h6>
                          
                          <div className="mb-2">
                            <small className="text-muted">
                              <i className="bi bi-calendar-event me-1"></i>
                              {order.timestamp ? dayjs(order.timestamp).format('MMM DD, YYYY HH:mm') : 'N/A'}
                            </small>
                          </div>
                          
                          <div className="mb-3">
                            <Badge bg="primary">
                              <i className="bi bi-currency-euro me-1"></i>
                              {getOrderTotal(order).toFixed(2)}
                            </Badge>
                            {order.ingredients?.length > 0 && (
                              <Badge bg="secondary" className="ms-1">
                                +{order.ingredients.length} ingredients
                              </Badge>
                            )}
                          </div>
                          
                          <div className="d-grid gap-2">
                            <Button 
                              variant="outline-primary" 
                              size="sm"
                              onClick={() => handleViewDetails(order)}
                              className="rounded-pill"
                            >
                              <i className="bi bi-eye me-1"></i>
                              View Details
                            </Button>
                            
                            {canCancelOrder(order) && (
                              <Button 
                                variant="outline-danger" 
                                size="sm"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowCancelConfirm(true);
                                }}
                                className="rounded-pill"
                              >
                                <i className="bi bi-x-circle me-1"></i>
                                Cancel Order
                              </Button>
                            )}
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Order Details Modal */}
      <Modal show={showDetails} onHide={() => setShowDetails(false)} size="lg" centered>
        <Modal.Header closeButton className="modal-header-gradient-danger">
          <Modal.Title>
            <i className="bi bi-receipt me-2"></i>
            Order Details #{selectedOrder?.id}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {selectedOrder && (
            <>
              <Row className="mb-4">
                <Col md={6}>
                  <div className="mb-3">
                    <strong>Status:</strong>
                    <Badge 
                      bg={selectedOrder.status === 'confirmed' ? 'success' : selectedOrder.status === 'cancelled' ? 'danger' : 'warning'}
                      className="ms-2 text-capitalize"
                    >
                      {selectedOrder.status}
                    </Badge>
                  </div>
                  <div className="mb-3">
                    <strong>Date:</strong> {selectedOrder.timestamp ? dayjs(selectedOrder.timestamp).format('MMMM DD, YYYY HH:mm') : 'N/A'}
                  </div>
                </Col>
                <Col md={6}>
                  <div className="mb-3">
                    <strong>Dish:</strong> {selectedOrder.dish_name} ({selectedOrder.size})
                  </div>
                  <div className="mb-3">
                    <strong>Base Price:</strong> €{({ small: 5, medium: 7, large: 9 }[selectedOrder.size] || 0).toFixed(2)}
                  </div>
                </Col>
              </Row>

              <div className="mb-4">
                <strong>Ingredients:</strong>
                {!selectedOrder.ingredients || selectedOrder.ingredients.length === 0 ? (
                  <span className="text-muted"> None</span>
                ) : (
                  <ListGroup variant="flush" className="mt-2">
                    {selectedOrder.ingredients.map((ingredient, index) => (
                      <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center border-0 px-0">
                        <span className="text-capitalize">{ingredient.name}</span>
                        <Badge bg="primary">€{ingredient.price.toFixed(2)}</Badge>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </div>

              <div className="border-top pt-3">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0"><strong>Total:</strong></h5>
                  <h5 className="mb-0 text-primary"><strong>€{getOrderTotal(selectedOrder).toFixed(2)}</strong></h5>
                </div>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button variant="outline-secondary" onClick={() => setShowDetails(false)} className="rounded-pill">
            Close
          </Button>
          {selectedOrder && canCancelOrder(selectedOrder) && (
            <Button 
              variant="danger" 
              onClick={() => {
                setShowDetails(false);
                setShowCancelConfirm(true);
              }}
              className="rounded-pill"
            >
              <i className="bi bi-x-circle me-1"></i>
              Cancel Order
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal 
        show={showCancelConfirm} 
        onHide={() => setShowCancelConfirm(false)} 
        centered
        className="modal-high-z"
      >
        <Modal.Header closeButton className="modal-header-gradient-red">
          <Modal.Title>
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            Cancel Order
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <p className="mb-3">Are you sure you want to cancel this order?</p>
          {selectedOrder && (
            <div className="bg-light p-3 rounded">
              <strong>Order #{selectedOrder.id}</strong><br/>
              {selectedOrder.dish_name} ({selectedOrder.size})<br/>
              Total: €{getOrderTotal(selectedOrder).toFixed(2)}
            </div>
          )}
          <p className="mt-3 text-muted small">
            <i className="bi bi-info-circle me-1"></i>
            Any limited ingredients will be made available again.
          </p>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button 
            variant="outline-secondary" 
            onClick={() => setShowCancelConfirm(false)} 
            className="rounded-pill modal-button-high-z"
          >
            Keep Order
          </Button>
          <Button 
            variant="danger" 
            onClick={handleCancelOrder}
            disabled={cancelling}
            className="rounded-pill modal-button-high-z"
          >
            {cancelling ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Cancelling...
              </>
            ) : (
              <>
                <i className="bi bi-trash me-1"></i>
                Cancel Order
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default OrderHistory;
