import { Row, Col, Form } from "react-bootstrap";
import { motion, AnimatePresence } from "framer-motion";
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useEffect, useState } from "react";
import "./JoinPage.css";
import Verify from "./Verify";
import { signupUser, resendConfirmationCode } from "../../api/auth";

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

  // Restore pending verification state on mount (e.g., after refresh)
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem('pendingVerification') === 'true';
      const storedUsername = sessionStorage.getItem('pendingUsername') || "";
      if (pending && storedUsername) {
        setUsername(storedUsername);
        setVerify(true);
      }
    } catch {}
  }, []);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.firstName) newErrors.firstName = "First name is required";
    if (!formData.lastName) newErrors.lastName = "Last name is required";
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Valid email is required";
    if (!formData.password || formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!/\d/.test(formData.password)) {
      newErrors.password = "Password must include at least one number";
    } else if (!/[^A-Za-z0-9]/.test(formData.password)) {
      newErrors.password = "Password must include at least one special character";
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
        try {
          sessionStorage.setItem('pendingVerification', 'true');
          sessionStorage.setItem('pendingUsername', username);
          sessionStorage.setItem('userEmail', formData.email); // Store email for later use
        } catch {}
        setVerify(true);
        console.log(
          "Signup successful! Please check your email to verify your account."
        );
      } catch(error){
        // Map Amplify/Cognito errors to friendly, field-specific messages
        const message = typeof error?.message === 'string' ? error.message : '';
        const lowerMsg = message.toLowerCase();
        const errorName = error?.name || '';

        // Check if error explicitly says to try logging in instead - this means account exists and is verified
        // NEVER resend verification codes for these errors
        if (lowerMsg.includes('please try logging in instead') || lowerMsg.includes('try logging in instead')) {
          setErrors({ email: "An account with this email already exists. Please try logging in instead." });
          return; // Don't show verify screen for this error
        }

        // UserLambdaValidationException with PreSignUp failed means Lambda rejected signup
        // If it mentions "already exists", NEVER try to resend - account likely exists and is verified
        if (errorName === 'UserLambdaValidationException' || message.includes('PreSignUp failed')) {
          if (lowerMsg.includes('already exists')) {
            setErrors({ email: "An account with this email already exists. Please try logging in instead." });
            return; // Don't try to resend - account exists
          }
          // If PreSignUp failed but doesn't say "already exists", show generic error
          setErrors({ email: "Signup failed. Please try again or contact support." });
          return;
        }

        if (error?.name === 'UsernameExistsException') {
          // UsernameExistsException typically means unconfirmed account - try to resend code
          try {
            const result = await resendConfirmationCode(formData.email);
            if (result?.success) {
              setUsername(formData.email);
              try {
                sessionStorage.setItem('pendingVerification', 'true');
                sessionStorage.setItem('pendingUsername', formData.email);
              } catch {}
              setVerify(true);
              return;
            }
          } catch {}
          setErrors({ email: "Email already exists" });
        } else if (lowerMsg.includes('already exists') && lowerMsg.includes('email')) {
          // Generic "already exists" error - be conservative and don't resend
          // Only resend if explicitly UsernameExistsException (handled above)
          setErrors({ email: "An account with this email already exists. Please try logging in instead." });
        } else if (error?.name === 'InvalidPasswordException') {
          setErrors({ password: message || "Invalid password" });
        } else if (/password/i.test(message)) {
          setErrors({ password: message });
        } else if (/email/i.test(message)) {
          // Generic email-related backend messages should be simplified
          setErrors({ email: "Invalid or already used email" });
        } else {
          // Fallback: show a generic signup error on the email field
          setErrors({ email: "Signup failed, please try again" });
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

      <Form onSubmit={handleSubmit} noValidate>
        <Row>
          <Col>
            <Form.Group className="form-group" controlId="formFirstName">
              <motion.label
                className="field-label"
                htmlFor="formFirstName"
                initial={false}
                animate={{ y: errors.firstName ? 0 : 12 }}
                transition={{ type: "spring", stiffness: 500, damping: 26 }}
              >
                First Name
              </motion.label>
              <AnimatePresence initial={false} mode="wait">
                {errors.firstName ? (
                  <motion.div
                    key="firstName-error"
                    className="error-message show"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { delay: 0.08 } }}
                    exit={{ opacity: 0 }}
                  >
                    {errors.firstName}
                  </motion.div>
                ) : (
                  <div key="firstName-empty" className="error-message" aria-hidden="true">&nbsp;</div>
                )}
              </AnimatePresence>
              <Form.Control
                className="form-control"
                type="text"
                placeholder=""
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                isInvalid={!!errors.firstName}
              />
            </Form.Group>
          </Col>
          <Col>
            <Form.Group className="form-group" controlId="formLastName">
              <motion.label
                className="field-label"
                htmlFor="formLastName"
                initial={false}
                animate={{ y: errors.lastName ? 0 : 12 }}
                transition={{ type: "spring", stiffness: 500, damping: 26 }}
              >
                Last Name
              </motion.label>
              <AnimatePresence initial={false} mode="wait">
                {errors.lastName ? (
                  <motion.div
                    key="lastName-error"
                    className="error-message show"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { delay: 0.08 } }}
                    exit={{ opacity: 0 }}
                  >
                    {errors.lastName}
                  </motion.div>
                ) : (
                  <div key="lastName-empty" className="error-message" aria-hidden="true">&nbsp;</div>
                )}
              </AnimatePresence>
              <Form.Control
                className="form-control"
                type="text"
                placeholder=""
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                isInvalid={!!errors.lastName}
              />
            </Form.Group>
          </Col>
        </Row>
        <Row>
          <Col>
            <Form.Group className="form-group" controlId="formEmail">
              <motion.label
                className="field-label"
                htmlFor="formEmail"
                initial={false}
                animate={{ y: errors.email ? 0 : 12 }}
                transition={{ type: "spring", stiffness: 500, damping: 26 }}
              >
                Email
              </motion.label>
              <AnimatePresence initial={false} mode="wait">
                {errors.email ? (
                  <motion.div
                    key="email-error"
                    className="error-message show"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { delay: 0.08 } }}
                    exit={{ opacity: 0 }}
                  >
                    {errors.email}
                  </motion.div>
                ) : (
                  <div key="email-empty" className="error-message" aria-hidden="true">&nbsp;</div>
                )}
              </AnimatePresence>
              <Form.Control
                className="form-control"
                type="email"
                placeholder=""
                name="email"
                value={formData.email}
                onChange={handleChange}
                isInvalid={!!errors.email}
              />
            </Form.Group>
          </Col>
          <Col>
            <Form.Group className="form-group password-group" controlId="formPassword">
              <motion.label
                className="field-label"
                htmlFor="formPassword"
                initial={false}
                animate={{ y: errors.password ? 0 : 12 }}
                transition={{ type: "spring", stiffness: 500, damping: 26 }}
              >
                Password
              </motion.label>
              <AnimatePresence initial={false} mode="wait">
                {errors.password ? (
                  <motion.div
                    key="password-error"
                    className="error-message show"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { delay: 0.08 } }}
                    exit={{ opacity: 0 }}
                  >
                    {errors.password}
                  </motion.div>
                ) : (
                  <div key="password-empty" className="error-message" aria-hidden="true">&nbsp;</div>
                )}
              </AnimatePresence>
              <Form.Control
                className="form-control password-input"
                type={showPassword ? "text" : "password"}
                placeholder=""
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
                  <FiEyeOff />
                ) : (
                  <FiEye />
                )}
              </button>
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