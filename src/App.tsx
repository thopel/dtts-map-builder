import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Community from "./views/Community";
import CommunityItem from "./views/CommunityItem";

import BoardBuilder from "./views/BoardBuilder";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BoardBuilder />} />

        {/* optionnel: fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
        <Route path="/community" element={<Community />} />
        <Route path="/community/:id" element={<CommunityItem />} />
      </Routes>
    </BrowserRouter>
  );
}
