import { Row, Col, Form } from "react-bootstrap";
import { useState } from "react";
import "./JoinPage.css";
import Verify from "./Verify";
import { signupUser } from "../../api/sign-up";

export default function JoinPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value.trim(),
    }));
    
    // Clear error for the field being changed
    if (errors[name]) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        [name]: "",
      }));
    }
  };

  const [errors, setErrors] = useState({});
  const [verify, setVerify] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.firstName) newErrors.firstName = "First name is required*";
    if (!formData.lastName) newErrors.lastName = "Last name is required*";
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Valid email is required*";
    if (!formData.password || formData.password.length < 8)
      newErrors.password = "Password must be at least 8 characters*";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      try {
        const { username } = await signupUser(formData);
        localStorage.setItem("signupUsername", username);
        localStorage.setItem("signupData", JSON.stringify(formData));
        setVerify(true);
        console.log(
          "Signup successful! Please check your email to verify your account."
        );
      } catch (err) {
        // Show custom error message for email already exists
        setErrors({ email: "Email already exists" });
      }
    }
  };

  return verify ? (
    <Verify />
  ) : (
    <div className="main-body" style={{ viewTransitionName: "main-body" }}>
      <Row className="info">
        <span className="info-line">
          Athletic Finance simplifies the business of sport. One notification.
          One Article, One community. Every day. We live in a World of noise.
          Sometimes less is more.
        </span>
      </Row>

      <Form onSubmit={handleSubmit}>
        <Row>
          <Col>
            <Form.Group className="form-group" controlId="formFirstName">
              <Form.Control
                className="form-control"
                type="text"
                placeholder="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                isInvalid={!!errors.firstName}
              />
              <Form.Control.Feedback
                className={`error-message ${errors.firstName ? "show" : ""}`}
                type="invalid"
              >
                {errors.firstName}
              </Form.Control.Feedback>
            </Form.Group>
          </Col>
          <Col>
            <Form.Group className="form-group" controlId="formLastName">
              <Form.Control
                className="form-control"
                type="text"
                placeholder="Enter your last name"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                isInvalid={!!errors.lastName}
              />
              <Form.Control.Feedback
                className={`error-message ${errors.lastName ? "show" : ""}`}
                type="invalid"
              >
                {errors.lastName}
              </Form.Control.Feedback>
            </Form.Group>
          </Col>
        </Row>
        <Row>
          <Col>
            <Form.Group className="form-group" controlId="formEmail">
              <Form.Control
                className="form-control"
                type="email"
                placeholder="Enter your email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                isInvalid={!!errors.email}
              />
              <Form.Control.Feedback
                className={`error-message ${errors.email ? "show" : ""}`}
                type="invalid"
              >
                {errors.email}
              </Form.Control.Feedback>
            </Form.Group>
          </Col>
          <Col>
            <Form.Group className="form-group" controlId="formPassword">
              <Form.Control
                type="password"
                placeholder="Enter your password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                isInvalid={!!errors.password}
              />
              <Form.Control.Feedback
                className={`error-message ${errors.password ? "show" : ""}`}
                type="invalid"
              >
                {errors.password}
              </Form.Control.Feedback>
            </Form.Group>
          </Col>
        </Row>
        <Row className="form-button-container">
          <button className="form-button">Join Now</button>
        </Row>
      </Form>

      <Row>
        <button></button>
      </Row>
    </div>
  );
}