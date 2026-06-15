import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Schedule from "@/pages/Schedule";
import Attendance from "@/pages/Attendance";
import Leave from "@/pages/Leave";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import { useAppStore } from "@/store";

export default function App() {
  const loadBasicData = useAppStore((s) => s.loadBasicData);

  useEffect(() => {
    loadBasicData();
  }, [loadBasicData]);

  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/exceptions" element={<Leave />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/rules" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}
