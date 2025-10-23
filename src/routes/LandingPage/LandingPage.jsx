import { Link } from "react-router-dom";
import "./LandingPage.css";

export default function LandingPage() {
  return (
    <div className="main-body" style={{ viewTransitionName: "main-body"}}>
      <h1 className="main-message">
        Athletic Finance simplifies business x sports.
      </h1>
      <Link to="/join" viewTransition>
        <button className="join-button">Join</button>
      </Link>
    </div>
  );
}
