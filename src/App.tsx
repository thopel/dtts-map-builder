import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import BoardBuilder from "./views/BoardBuilder";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BoardBuilder />} />

        {/* optionnel: fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
