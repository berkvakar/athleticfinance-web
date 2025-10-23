import { Row, Col } from "react-bootstrap";
import { useState } from "react";
import "./PlanPage.css";


export default function PlanPage() {
  const [billingCycle, setBillingCycle] = useState("Monthly");
  const handleJoin = () => {
    console.log("pressed");
  };
  // const handleJoin = async (planName) => {
    // const formData = JSON.parse(localStorage.getItem("signupData"));
    // if (!formData) return alert("No Sign-Up Data Found!");

    // const command = new SignUpCommand({
    //   ClientId: clientId,
    //   Username: formData.firstName + formData.lastName + Date.now(),
    //   Password: formData.password,
    //   UserAttributes: [
    //     { Name: "email", Value: formData.email },
    //     { Name: "name", Value: formData.firstName + " " + formData.lastName },
    //     { Name: "custom:PaidPlan", Value: planName },
    //   ],
    // });

    // try {
    //   await client.send(command);
    //   alert("Signup successful! Check your email to verify your account.");
    //   localStorage.removeItem("signupData");
    // } catch (err) {
    //   alert(err.message);
    // }
  // };

  const prices = {
    Monthly: { af: 1, afPlus: 2 },
    Annual: { af: 2, afPlus: 4 },
  };

  return (
    <div className="payment-body">
      <Row className="payment-options">
        {/* AF+ Plan */}
        <Col xs={12} md={5} className="plan-col plan-col-1">
          <h3>AF+</h3>
          <p>
            <span className="price">${prices[billingCycle].afPlus}</span>
            <br />
            <span className="price-des">Billed {billingCycle}</span>
          </p>
          <ul>
            <li>Feature 1</li>
            <li>Feature 2</li>
            <li>Feature 3</li>
            <li>Feature 4</li>
            <li>Feature 5</li>
          </ul>
          <button className="join-but" onClick={() => handleJoin("AFPlus")}>
            Join
          </button>
        </Col>

        {/* Toggle Column */}
        <Col xs={12} md={2} className="toggle-col">
          <button
            onClick={() => setBillingCycle("Monthly")}
            className={billingCycle === "Monthly" ? "active" : ""}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle("Annual")}
            className={billingCycle === "Annual" ? "active" : ""}
          >
            Annual
          </button>
        </Col>

        {/* AF Plan */}
        <Col xs={12} md={5} className="plan-col plan-col-2">
          <h3>AF</h3>
          <p>
            <span className="price">${prices[billingCycle].af}</span>
            <br />
            <span className="price-des">Billed {billingCycle}</span>
          </p>
          <ul>
            <li>Feature 1</li>
            <li>Feature 2</li>
            <li>Feature 3</li>
            <li>Feature 4</li>
            <li>Feature 5</li>
          </ul>
          <button className="join-but" onClick={() => handleJoin("AF")}>
            Join
          </button>
        </Col>
      </Row>
    </div>
  );
}
