import { Row, Col, Form } from "react-bootstrap";
import { motion, AnimatePresence } from "framer-motion";
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./PartnershipApplication.css";
import Verify from "../JoinPage/Verify";
import { signInPartner, signupPartnerSimple, resendConfirmationCode, checkPartnerStatus, convertUserToPendingPartner, getAuthenticatedUser } from "../../api/auth";

export default function PartnershipApplication() {
  const [formData, setFormData] = useState({
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
        // STEP 1: Check partner status first
        const partnerCheck = await checkPartnerStatus(formData.email);
        
        // If API is unavailable, fallback to sign in first
        if (partnerCheck.apiUnavailable) {
          console.log('Partner status API unavailable, attempting sign in...');
          try {
            const signInResult = await signInPartner(formData.email, formData.password);
            if (signInResult.isSignedIn) {
              // Sign in successful - try to convert to pending partner
              const user = await getAuthenticatedUser();
              if (user) {
                const convertResult = await convertUserToPendingPartner(formData.email, user.userId);
                if (convertResult.success) {
                  setErrors({ email: "Partnership application submitted! Your application is pending admin approval." });
                  return;
                }
              }
              console.log("Sign in successful!");
              return;
            }
          } catch (signInError) {
            const signInMsg = typeof signInError?.message === 'string' ? signInError.message : '';
            const lowerSignInMsg = signInMsg.toLowerCase();
            
            if (signInError?.name === 'NotAuthorizedException' || 
                lowerSignInMsg.includes('incorrect') || 
                lowerSignInMsg.includes('invalid') ||
                lowerSignInMsg.includes('password')) {
              setErrors({ password: "Incorrect password. Please try again." });
              return;
            }
            
            if (signInError?.name === 'UserNotFoundException' || 
                lowerSignInMsg.includes('does not exist') ||
                lowerSignInMsg.includes('not found')) {
              // User doesn't exist - proceed with signup
              console.log('User not found, proceeding with signup...');
            } else {
              console.log('Sign in failed, proceeding with signup...');
            }
          }
          // Fall through to signup below
        } else if (partnerCheck.error) {
          setErrors({ email: "Unable to verify account status. Please try again later." });
          return;
        }
        
        // STEP 2: Handle different partner status cases
        if (!partnerCheck.apiUnavailable && partnerCheck.exists) {
          // Case 1: Already an active partner
          if (partnerCheck.isPartner && partnerCheck.partnerStatus === 'true') {
            setErrors({ email: "You are already an AF Partner. Please sign in instead." });
            return;
          }
          
          // Case 2: Application is pending
          if (partnerCheck.partnerStatus === 'pending') {
            setErrors({ email: "Your partnership application is still pending admin approval. Please wait for approval or contact support." });
            return;
          }
          
          // Case 3: User exists but not a partner - try to sign in and convert
          if (!partnerCheck.isPartner) {
            if (!partnerCheck.emailVerified) {
              // Account not verified - try to resend code
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
              setErrors({ email: "An account with this email exists but is not verified. Please check your email for verification code." });
              return;
            }
            
            // User exists, verified, but not a partner - try to sign in
            try {
              const signInResult = await signInPartner(formData.email, formData.password);
              if (signInResult.isSignedIn) {
                // Sign in successful - convert to pending partner and notify admin
                const convertResult = await convertUserToPendingPartner(
                  formData.email, 
                  partnerCheck.userId || formData.email
                );
                
                if (convertResult.success) {
                  setErrors({ email: "Partnership application submitted! Your application is pending admin approval." });
                } else {
                  setErrors({ email: "Signed in successfully, but failed to submit partnership application. Please try again or contact support." });
                }
                return;
              }
            } catch (signInError) {
              const signInMsg = typeof signInError?.message === 'string' ? signInError.message : '';
              const lowerSignInMsg = signInMsg.toLowerCase();
              
              if (signInError?.name === 'NotAuthorizedException' || 
                  lowerSignInMsg.includes('incorrect') || 
                  lowerSignInMsg.includes('invalid') ||
                  lowerSignInMsg.includes('password')) {
                setErrors({ password: "Incorrect password. Please try again." });
                return;
              }
              
              // Sign in failed for other reasons
              setErrors({ password: "Sign in failed. Please try again." });
              return;
            }
          }
        }
        
        // STEP 3: User doesn't exist - sign them up as pending partner
        const { username } = await signupPartnerSimple(formData);
        setUsername(username);
        try {
          sessionStorage.setItem('pendingVerification', 'true');
          sessionStorage.setItem('pendingUsername', username);
        } catch {}
        setVerify(true);
        console.log(
          "Partner application submitted! Please check your email to verify your account. Your application is pending admin approval."
        );
      } catch(error){
        const message = typeof error?.message === 'string' ? error.message : '';
        const lowerMsg = message.toLowerCase();
        const errorName = error?.name || '';

        // Handle PreSignUp trigger errors (from your Lambda trigger)
        if (errorName === 'UserLambdaValidationException' && message.includes('PreSignUp failed')) {
          if (lowerMsg.includes('already exists') || lowerMsg.includes('try logging in instead')) {
            setErrors({ email: "An account with this email already exists. Please try logging in instead." });
            return;
          }
          if (lowerMsg.includes('partner') && (lowerMsg.includes('already') || lowerMsg.includes('active'))) {
            // User is already a partner
            setErrors({ email: "You are already an AF Partner. Please sign in instead." });
            return;
          }
          setErrors({ email: "Signup failed. Please try again or contact support." });
          return;
        }

        if (errorName === 'UsernameExistsException') {
          // Account exists but not verified, try to resend code
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
          setErrors({ email: "An account with this email already exists. Please check your email for verification code." });
        } else if (errorName === 'InvalidPasswordException') {
          setErrors({ password: message || "Invalid password" });
        } else if (/password/i.test(message)) {
          setErrors({ password: message });
        } else if (/email/i.test(message)) {
          setErrors({ email: "Invalid or already used email" });
        } else {
          setErrors({ email: "Sign in failed, please try again" });
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
        </Row>
        <Row>
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
          <button className="form-button">Apply</button>
        </Row>
      </Form>

      <Row className="partner-signin-link">
        <Col>
          <span className="signin-text">
            Already an AF Partner?{" "}
            <Link to="/partnership/signin" className="signin-link">
              Sign in
            </Link>
          </span>
        </Col>
      </Row>
    </div>
  );
}

