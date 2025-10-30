import { BrowserRouter as Router, Routes, Route ,createBrowserRouter, RouterProvider, redirect} from "react-router-dom";
import Layout from "./Layout";
import LandingPage from "./routes/LandingPage/LandingPage";
import JoinPage from "./routes/JoinPage/JoinPage";
import Articles from "./routes/Articles/Articles";
import PlanPage from "./routes/PlanPage/PlanPage";
import { canAccessJoin, canAccessPlans, isUserAuthenticated } from "./api/auth";

import "./App.css";
// function App() {
//   return (
//     <Router>
//       <Routes location={location}>
//         <Route path="/" element={<Layout />}>
//           <Route index element={<LandingPage />} />
//           <Route path="/join" element={<JoinPage />} />
//           <Route path="/plans" element={<PaymentPage />} />
//           <Route path="/articles" element={<Articles />} />
//         </Route>
//       </Routes>
//     </Router>
//   );
// }

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <Layout />,
      children: [
        { index: true, element: <LandingPage /> },
        { 
          path: "join", 
          element: <JoinPage />, 
          loader: async () => {
            // If already authenticated, send to plans
            if (await isUserAuthenticated()) {
              return redirect("/plans");
            }
            if (!canAccessJoin()) {
              return redirect("/");
            }
            return null;
          }
        },
        { 
          path: "plans", 
          element: <PlanPage />, 
          loader: async () => {
            // Allow if user verified in-session OR currently authenticated
            if (canAccessPlans()) {
              return null;
            }
            if (await isUserAuthenticated()) {
              return null;
            }
            return redirect("/");
          }
        },
        { path: "articles", element: <Articles /> },
      ],
    },
  ],
  {}
);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
