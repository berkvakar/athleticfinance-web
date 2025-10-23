import { BrowserRouter as Router, Routes, Route ,createBrowserRouter, RouterProvider,} from "react-router-dom";
import Layout from "./Layout";
import LandingPage from "./routes/LandingPage/LandingPage";
import JoinPage from "./routes/JoinPage/JoinPage";
import Articles from "./routes/Articles/Articles";
import PlanPage from "./routes/PlanPage/PlanPage";

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
        { path: "join", element: <JoinPage /> },
        { path: "plans", element: <PlanPage /> },
        { path: "articles", element: <Articles /> },
      ],
    },
  ],
  {
    viewTransitions: true,
  }
);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
