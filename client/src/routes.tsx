import { lazy, useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { atoms } from "./atoms";
import { useAtom } from "jotai";
import { atomEffect } from "jotai-effect";

const Home = lazy(() => import("./App"));
const Room = lazy(() => import("./Room"));

export const AppRoutes = () => {
  const wsEffect = atomEffect((get, set) => {
    const val = get(atoms.user);
    console.log("value changed!");
  });

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/room/:id" element={<Room />} />
    </Routes>
  );
};
