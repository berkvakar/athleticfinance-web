import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="main-body">
      <h1 className="main-message">
        Athletic Finance simplifies business x sports.
      </h1>
      <Link to="/join">
        <button className="join-button">Join</button>
      </Link>
    </div>
  );
}
