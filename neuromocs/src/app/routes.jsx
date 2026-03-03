import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import BrainTerms from "./pages/BrainTerms";
import LongTermMemory from "./pages/LongTermMemory";
import Flashcards from "./pages/Flashcards";
import BrainLabeler from "./pages/BrainLabeler";
import TagExam from "./pages/TagExam";
import Videos from "./pages/Videos";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/brain-terms" element={<BrainTerms />} />
      <Route path="/ltm" element={<LongTermMemory />} />
      <Route path="/ltm/flashcards" element={<Flashcards />} />
      <Route path="/ltm/label" element={<BrainLabeler />} />
      <Route path="/ltm/tag-exam" element={<TagExam />} />
      <Route path="/videos" element={<Videos />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
