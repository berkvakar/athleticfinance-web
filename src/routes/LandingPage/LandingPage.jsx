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
      console.log('[LandingPage] isUserAuthenticated() returned:', authed);
      const eligible = canAccessPlans();
      console.log('[LandingPage] canAccessPlans() returned:', eligible);
      console.log('[LandingPage] Will show View Plans:', authed || eligible);
      if (mounted) {
        console.log('[LandingPage] Setting canViewPlans to:', authed || eligible);
        setCanViewPlans(authed || eligible);
      } else {
        console.log('[LandingPage] Component unmounted before state update');
      }
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