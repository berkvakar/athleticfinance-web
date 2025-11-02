import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { grantJoinAccess, isUserAuthenticated, canAccessPlans } from "../../api/auth";
import "./LandingPage.css";

export default function LandingPage() {
  const [canViewPlans, setCanViewPlans] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const authed = await isUserAuthenticated();
      const eligible = canAccessPlans();
      if (mounted) setCanViewPlans(authed || eligible);
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="main-body">
      <h1 className="main-message">
        Athletic Finance simplifies business x sports.
      </h1>
      {canViewPlans ? (
        <Link to="/plans" state={{ animate: true, dir: 'forward' }}>
          <button className="join-button">View Plans</button>
        </Link>
      ) : (
        <Link to="/join" state={{ animate: true, dir: 'forward' }} onClick={() => { grantJoinAccess(); }}>
          <button className="join-button">Join</button>
        </Link>
      )}
    </div>
  );
}