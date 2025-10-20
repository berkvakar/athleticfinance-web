import { Row, Col } from "react-bootstrap";

export default function PaymentPage() {
  return (
    <div className="payment-body">
      <Row className="text-center">
        <h1>Select a Member Plan</h1>
      </Row>
      <Row className="payment-options text-center">
        <Col>
          <div className="plan-card">
            <h3>AF Member</h3>
            <p>$10/month</p>
            <button>Choose Plan</button>
          </div>
        </Col>
        <Col>
          <div className="plan-card">
            <h3>AF+ Member</h3>
            <p>$20/month</p>
            <button >Choose Plan</button>
          </div>
        </Col>
      </Row>
    </div>
  );
}
