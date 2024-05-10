import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";

const Home = lazy(() => import("./App"));
const Room = lazy(() => import("./Room"));

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/room/:roomId" element={
        <Suspense fallback={<div>Loading...</div>}>
          <Room />
        </Suspense>
      } />
    </Routes>
  );
};
