import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import Layout from "./Layout";
import LandingPage from "./routes/LandingPage/LandingPage";
import JoinPage from "./routes/JoinPage/JoinPage";
import Articles from "./routes/Articles/Articles";
import PaymentPage from "./routes/PaymentPage/PaymentPage";

import "./App.css";
// function AnimatedRoutes() {
//   const location = useLocation();
//   return (
//     <TransitionGroup>
//       <CSSTransition
//         key={location.key}
//         timeout={300}
//         classNames="page"
//         unmountOnExit
//       >
        
//       </CSSTransition>
//     </TransitionGroup>
//   );
// }
function App() {
  return (
    <Router>
     <Routes location={location}>
          <Route path="/" element={<Layout />}>
            <Route index element={<LandingPage />} />
            <Route path="/join" element={<JoinPage />} />
            <Route path="/plans" element={<PaymentPage />} />
            <Route path="/articles" element={<Articles />} />
          </Route>
        </Routes>
    </Router>
  );
}

export default App;
