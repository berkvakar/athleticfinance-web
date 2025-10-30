import { Row, Col, Form } from "react-bootstrap";
import { useState } from "react";
import "./JoinPage.css";
import Verify from "./Verify";
import { signupUser } from "../../api/auth";

export default function JoinPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: name === "password" ? value : value.trim(),
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
  const [username, setUsername] = useState("");

  const validateForm = () => {
    const newErrors = {};
    if (!formData.firstName) newErrors.firstName = "First name is required*";
    if (!formData.lastName) newErrors.lastName = "Last name is required*";
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Valid email is required*";
    if (!formData.password || formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters*";
    } else if (!/\d/.test(formData.password)) {
      newErrors.password = "Password must include at least one number*";
    } else if (!/[^A-Za-z0-9]/.test(formData.password)) {
      newErrors.password = "Password must include at least one special character*";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      try {
        const { username } = await signupUser(formData);
        setUsername(username);
        setVerify(true);
        console.log(
          "Signup successful! Please check your email to verify your account."
        );
      } catch(error){
        // Map Amplify errors to the correct field
        if (error?.name === 'UsernameExistsException') {
          setErrors({ email: "Email already exists" });
        } else if (error?.name === 'InvalidPasswordException') {
          setErrors({ password: error.message || "Invalid password" });
        } else if (typeof error?.message === 'string' && /password/i.test(error.message)) {
          setErrors({ password: error.message });
        } else if (typeof error?.message === 'string' && /email/i.test(error.message)) {
          setErrors({ email: error.message });
        } else {
          // Default to email field if uncertain
          setErrors({ email: error?.message || "Signup failed" });
        }
      }
    }
  };

  return verify ? (
    <Verify username={username} />
  ) : (
    <div className="main-body">
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
            <Form.Group className="form-group password-group" controlId="formPassword">
              <Form.Control
                className="form-control password-input"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                isInvalid={!!errors.password}
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="toggle-visibility"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? (
                  // Minimal eye-off (stroke based)
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 3l18 18"/>
                      <path d="M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 3-3 3 3 0 0 0-.4-1.5"/>
                      <path d="M9.9 5.3A10.9 10.9 0 0 1 12 5c5 0 9.2 3.2 11 7-1 2.4-2.9 4.4-5.2 5.7"/>
                      <path d="M6.6 6.6C4.2 7.9 2.4 9.9 1.5 12c.9 2.1 2.5 3.9 4.5 5.2A12.3 12.3 0 0 0 12 19"/>
                    </g>
                  </svg>
                ) : (
                  // Minimal eye (stroke based)
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 5c5 0 9.2 3.2 11 7-1.8 3.8-6 7-11 7S3.8 15.8 2 12C3.8 8.2 7 5 12 5Z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </g>
                  </svg>
                )}
              </button>
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