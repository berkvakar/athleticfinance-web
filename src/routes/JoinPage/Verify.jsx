import { Row, Col } from "react-bootstrap";
import { useState, useRef } from "react";
import "./JoinPage.css";
import { verifyUser, resendConfirmationCode, markSignupComplete } from "../../api/auth";
import { useNavigate } from "react-router-dom";



export default function Verify({ username }) {
  const navigate = useNavigate();

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const inputRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
  ];

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError("Please enter a complete 6-digit code");
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      const success = await verifyUser(username, code);
      
      if (success) {
        markSignupComplete();
        try {
          sessionStorage.removeItem('pendingVerification');
          sessionStorage.removeItem('pendingUsername');
        } catch {}
        navigate("/plans");
      } else {
        setError("Invalid or expired code. Please try again.");
      }
    } catch{
      setError("Verification failed. Please check your code and try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    setError("");

    try {
      const result = await resendConfirmationCode(username);
      
      if (result.success) {
        setError(""); // Clear any existing errors
        alert("New verification code sent to your email!");
      } else {
        setError("Failed to resend code. Please try again.");
      }
    } catch{
      setError("Failed to resend code. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  function handleInput(e, index) {
    const input = e.target;
    const previousInput = inputRefs[index - 1];
    const nextInput = inputRefs[index + 1];
    const newCode = [...code];
    if (/^[a-z]+$/.test(input.value)) {
      const uc = input.value.toUpperCase();
      newCode[index] = uc;
      inputRefs[index].current.value = uc;
    } else {
      newCode[index] = input.value;
    }
    setCode(newCode.join(""));
    input.select();
    if (input.value === "") {
      if (previousInput) {
        previousInput.current.focus();
      }
    } else if (nextInput) {
      nextInput.current.select();
    }
  }

  function handleFocus(e) {
    e.target.select();
  }

  function handleKeyDown(e, index) {
    const input = e.target;
    const previousInput = inputRefs[index - 1]

    if ((e.keyCode === 8 || e.keyCode === 46) && input.value === "") {
      e.preventDefault();
      setCode(
        (prevCode) => prevCode.slice(0, index) + prevCode.slice(index + 1)
      );
      if (previousInput) {
        previousInput.current.focus();
      }
    }
  }

  const handlePaste = (e) => {
    const pastedCode = e.clipboardData.getData("text");
    if (pastedCode.length === 6) {
      setCode(pastedCode);
      inputRefs.forEach((inputRef, index) => {
        inputRef.current.value = pastedCode.charAt(index);
      });
    }
  };

  return (
    <Row className="verify-body">
      <Row>
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <input
              className="digit-box"
              key={index}
              type="text"
              maxLength={1}
              onChange={(e) => handleInput(e, index)}
              ref={inputRefs[index]}
              autoFocus={index === 0}
              onFocus={handleFocus}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onPaste={handlePaste}
            />
          ))}
      </Row>
      
      {error && (
        <Row className="error-row">
          <div className="error-message" style={{ color: "red", textAlign: "center", marginTop: "10px" }}>
            {error}
          </div>
        </Row>
      )}
      
      <Row className="button-row">
        <button 
          className="verify-button" 
          onClick={handleVerify}
          disabled={isVerifying || isResending}
        >
          {isVerifying ? "Verifying..." : "Verify"}
        </button>
      </Row>
      
      <Row className="button-row">
        <button 
          className="resend-button" 
          onClick={handleResendCode}
          disabled={isResending || isVerifying}
        >
          {isResending ? "Sending..." : "Resend Code"}
        </button>
      </Row>
    </Row>
  );
}
