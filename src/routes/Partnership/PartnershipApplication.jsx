import { Row, Col, Form } from "react-bootstrap";
import { motion, AnimatePresence } from "framer-motion";
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./PartnershipApplication.css";
import Verify from "../JoinPage/Verify";
import { signInPartner, signupPartnerSimple, resendConfirmationCode, checkPartnerStatus, convertUserToPendingPartner, getAuthenticatedUser, getPartnerStatusFromAttributes, isUserAuthenticated, canAccessPlans } from "../../api/auth";

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
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    const pending = sessionStorage.getItem('pendingVerification') === 'true';
    const storedUsername = sessionStorage.getItem('pendingUsername') || "";
    if (pending && storedUsername) {
      setUsername(storedUsername);
      setVerify(true);
      setLoading(false);
      return;
    }
    
    (async () => {
      const authenticated = await isUserAuthenticated();
      const eligible = canAccessPlans();
      const isSignedInUser = authenticated || eligible;
      
      if (mounted) {
        setIsSignedIn(isSignedInUser);
        
        if (authenticated) {
          try {
            const partnerStatus = await getPartnerStatusFromAttributes();
            if (partnerStatus.email && mounted) {
              setFormData(prev => ({ ...prev, email: partnerStatus.email }));
            }
          } catch (err) {
          }
        } else if (eligible) {
          try {
            const storedEmail = sessionStorage.getItem('userEmail');
            if (storedEmail && mounted) {
              setFormData(prev => ({ ...prev, email: storedEmail }));
            }
          } catch (storageError) {
          }
        }
        
        setLoading(false);
      }
    })();
    
    return () => { mounted = false; };
  }, []);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Valid email is required";
    
    if (!isSignedIn) {
      if (!formData.password || formData.password.length < 8) {
        newErrors.password = "Password must be at least 8 characters";
      } else if (!/\d/.test(formData.password)) {
        newErrors.password = "Password must include at least one number";
      } else if (!/[^A-Za-z0-9]/.test(formData.password)) {
        newErrors.password = "Password must include at least one special character";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      setLoading(true);
      try {
        if (isSignedIn) {
          try {
            const partnerStatus = await getPartnerStatusFromAttributes();
            
            if (partnerStatus.partnerStatus === 'true') {
              setLoading(false);
              setErrors({ email: "You are already an AF Partner. Please sign in to your dashboard." });
              return;
            }
            
            if (partnerStatus.partnerStatus === 'pending') {
              setLoading(false);
              setErrors({ email: "Your partnership application is still pending admin approval. Please wait for approval or contact support." });
              return;
            }
            
            if (!partnerStatus.isPartner || 
                !partnerStatus.partnerStatus || 
                partnerStatus.partnerStatus === 'false' || 
                partnerStatus.partnerStatus === 'none' ||
                partnerStatus.partnerStatus === null) {
              const convertResult = await convertUserToPendingPartner(partnerStatus.email || formData.email, partnerStatus.userId);
              
              if (convertResult.success) {
                setLoading(false);
                setApplicationSubmitted(true);
              } else {
                setLoading(false);
                setErrors({ email: "Failed to submit partnership application. Please try again or contact support." });
              }
              return;
            }
          } catch (attrError) {
            setLoading(false);
            setErrors({ email: "Unable to check partner status. Please try again." });
            return;
          }
        }
        
        const partnerCheck = await checkPartnerStatus(formData.email);
        
        if (partnerCheck.apiUnavailable) {
          try {
            const signInResult = await signInPartner(formData.email, formData.password);
            
            if (signInResult.isSignedIn || signInResult.alreadySignedIn) {
              const partnerStatus = await getPartnerStatusFromAttributes();
              
              if (partnerStatus.partnerStatus === 'true') {
                setLoading(false);
                setErrors({ email: "You are already an AF Partner. Please sign in to your dashboard." });
                return;
              }
              
              if (partnerStatus.partnerStatus === 'pending') {
                setLoading(false);
                setErrors({ email: "Your partnership application is still pending admin approval. Please wait for approval or contact support." });
                return;
              }
              
              if (!partnerStatus.isPartner || 
                  !partnerStatus.partnerStatus || 
                  partnerStatus.partnerStatus === 'false' || 
                  partnerStatus.partnerStatus === 'none' ||
                  partnerStatus.partnerStatus === null) {
                const convertResult = await convertUserToPendingPartner(formData.email, partnerStatus.userId || formData.email);
                
                if (convertResult.success) {
                  setLoading(false);
                  setApplicationSubmitted(true);
                } else {
                  setLoading(false);
                  setErrors({ email: "Signed in successfully, but failed to submit partnership application. Please try again or contact support." });
                }
                return;
              }
              
              setLoading(false);
              return;
            }
          } catch (signInError) {
            setLoading(false);
            const signInMsg = typeof signInError?.message === 'string' ? signInError.message : '';
            const lowerSignInMsg = signInMsg.toLowerCase();
            const errorName = signInError?.name || '';
            
            if (errorName === 'NotAuthorizedException' || 
                lowerSignInMsg.includes('incorrect') || 
                lowerSignInMsg.includes('invalid') ||
                lowerSignInMsg.includes('password')) {
              setErrors({ password: "Incorrect email or password. Please try again." });
              return;
            }
            
            if (errorName === 'UserNotFoundException' || 
                lowerSignInMsg.includes('does not exist') ||
                lowerSignInMsg.includes('not found')) {
            }
          }
        } else if (partnerCheck.error) {
          setLoading(false);
          setErrors({ email: "Unable to verify account status. Please try again later." });
          return;
        }
        
        if (!partnerCheck.apiUnavailable && partnerCheck.exists) {
          if (partnerCheck.isPartner && partnerCheck.partnerStatus === 'true') {
            setLoading(false);
            setErrors({ email: "You are already an AF Partner. Please sign in instead." });
            return;
          }
          
          if (partnerCheck.partnerStatus === 'pending') {
            setLoading(false);
            setErrors({ email: "Your partnership application is still pending admin approval. Please wait for approval or contact support." });
            return;
          }
          
          if (!partnerCheck.isPartner) {
            if (!partnerCheck.emailVerified) {
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
              setLoading(false);
              setErrors({ email: "An account with this email exists but is not verified. Please check your email for verification code." });
              return;
            }
            
            try {
              const signInResult = await signInPartner(formData.email, formData.password);
              if (signInResult.isSignedIn) {
                const convertResult = await convertUserToPendingPartner(
                  formData.email, 
                  partnerCheck.userId || formData.email
                );
                
                if (convertResult.success) {
                  setLoading(false);
                  setApplicationSubmitted(true);
                } else {
                  setLoading(false);
                  setErrors({ email: "Signed in successfully, but failed to submit partnership application. Please try again or contact support." });
                }
                return;
              }
            } catch (signInError) {
              setLoading(false);
              const signInMsg = typeof signInError?.message === 'string' ? signInError.message : '';
              const lowerSignInMsg = signInMsg.toLowerCase();
              
              if (signInError?.name === 'NotAuthorizedException' || 
                  lowerSignInMsg.includes('incorrect') || 
                  lowerSignInMsg.includes('invalid') ||
                  lowerSignInMsg.includes('password')) {
                setErrors({ password: "Incorrect password. Please try again." });
                return;
              }
              
              setErrors({ password: "Sign in failed. Please try again." });
              return;
            }
          }
        }
        
        setLoading(false);
        const { username } = await signupPartnerSimple(formData);
        setUsername(username);
        try {
          sessionStorage.setItem('pendingVerification', 'true');
          sessionStorage.setItem('pendingUsername', username);
        } catch {}
        setVerify(true);
      } catch(error){
        setLoading(false);
        const message = typeof error?.message === 'string' ? error.message : '';
        const lowerMsg = message.toLowerCase();
        const errorName = error?.name || '';

        if (errorName === 'UserLambdaValidationException' && message.includes('PreSignUp failed')) {
          if (lowerMsg.includes('already exists') || lowerMsg.includes('try logging in instead')) {
            setErrors({ email: "An account with this email already exists. Please try logging in instead." });
            return;
          }
          if (lowerMsg.includes('partner') && (lowerMsg.includes('already') || lowerMsg.includes('active'))) {
            setErrors({ email: "You are already an AF Partner. Please sign in instead." });
            return;
          }
          setErrors({ email: "Signup failed. Please try again or contact support." });
          return;
        }

        if (errorName === 'UsernameExistsException') {
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
                readOnly={isSignedIn}
                disabled={isSignedIn}
              />
            </Form.Group>
          </Col>
        </Row>
        {!isSignedIn && (
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
        )}
        <Row className="form-button-container">
          <Col>
            <AnimatePresence mode="wait">
              {applicationSubmitted ? (
                <motion.div
                  key="success-message"
                  layoutId="button-morph"
                  className="success-message-container"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    className="success-message"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  >
                    Application submitted! Pending approval. You'll receive an email update.
                  </motion.div>
                </motion.div>
              ) : (
                <motion.button
                  key="submit-button"
                  layoutId="button-morph"
                  className="form-button"
                  disabled={loading}
                  type="submit"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {loading ? 'Loading...' : 'Apply'}
                </motion.button>
              )}
            </AnimatePresence>
          </Col>
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

