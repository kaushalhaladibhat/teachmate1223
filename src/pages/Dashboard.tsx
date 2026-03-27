import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Users, Shuffle, BarChart3, Bot, LogOut, Calendar, Bell, Shield, ClipboardList, FileQuestion } from "lucide-react";
import { ref, set, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { isAdmin } from "@/lib/roles";
import StudentManager, { Student } from "@/components/StudentManager";
import RandomPicker from "@/components/RandomPicker";
import MarksTracker from "@/components/MarksTracker";
import AIAssistant from "@/components/AIAssistant";
import TimetableManager from "@/components/TimetableManager";
import AlertsManager from "@/components/AlertsManager";
import AlertBanner from "@/components/AlertBanner";
import PeriodTracker from "@/components/PeriodTracker";
import StudentReports from "@/components/StudentReports";
import QuestionPaperGenerator from "@/components/QuestionPaperGenerator";

type Tab = "students" | "picker" | "marks" | "ai" | "timetable" | "alerts" | "reports" | "qpaper";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const admin = isAdmin(user?.email);
  const [active, setActive] = useState<Tab>("students");
  const [students, setStudents] = useState<Student[]>([]);
  const [reports, setReports] = useState<Record<string, any>>({});
  const [timetableEntries, setTimetableEntries] = useState<any[]>([]);

  const uid = user?.uid || "";

  // Sync students from Firebase
  useEffect(() => {
    if (!uid) return;
    const studentsRef = ref(db, `users/${uid}/students`);
    const unsub = onValue(studentsRef, (snap) => {
      const data = snap.val();
      if (data) {
        setStudents(Object.values(data));
      } else {
        // Migrate from localStorage if exists
        const saved = localStorage.getItem("teachmate_students");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.length > 0) {
            set(studentsRef, Object.fromEntries(parsed.map((s: Student) => [s.id, s])));
          }
          localStorage.removeItem("teachmate_students");
        } else {
          setStudents([]);
        }
      }
    });
    return () => unsub();
  }, [uid]);

  const updateStudents = (newStudents: Student[]) => {
    setStudents(newStudents);
    if (uid) {
      const studentsRef = ref(db, `users/${uid}/students`);
      if (newStudents.length > 0) {
        set(studentsRef, Object.fromEntries(newStudents.map(s => [s.id, s])));
      } else {
        set(studentsRef, null);
      }
    }
  };

  const firstName = user?.displayName?.split(" ")[0] || user?.email?.split("@")[0] || "Teacher";

  const tabs: { key: Tab; label: string; icon: typeof Users }[] = [
    { key: "students", label: "Students", icon: Users },
    { key: "marks", label: "Marks", icon: BarChart3 },
    { key: "reports", label: "Reports", icon: ClipboardList },
    { key: "timetable", label: "Schedule", icon: Calendar },
    { key: "qpaper", label: "Q-Paper", icon: FileQuestion },
    { key: "alerts", label: "Alerts", icon: Bell },
    { key: "picker", label: "Picker", icon: Shuffle },
    { key: "ai", label: "Nexus", icon: Bot },
  ];

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-5 pt-6 pb-3 flex items-center justify-between"
      >
        <div>
          <p className="text-xs text-muted-foreground">Welcome back,</p>
          <h1 className="text-xl font-bold text-foreground">
            {firstName} {admin ? "👑" : "👋"}
          </h1>
          {admin && (
            <span className="inline-flex items-center gap-1 text-[10px] text-primary font-semibold mt-0.5">
              <Shield className="w-3 h-3" /> Admin
            </span>
          )}
        </div>
        <button onClick={logout} className="glass-card-light p-2.5 rounded-xl text-muted-foreground">
          <LogOut className="w-4 h-4" />
        </button>
      </motion.div>

      {/* Alert Banner */}
      <div className="px-5 pb-2">
        <AlertBanner />
      </div>

      {/* Stats */}
      <div className="px-5 pb-3">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Students", value: students.length, color: "text-primary" },
            { label: "Present", value: students.filter(s => s.present).length, color: "text-success" },
            { label: "Avg Marks", value: students.length ? (students.reduce((a, s) => a + s.marks, 0) / students.length).toFixed(0) : "0", color: "text-accent" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="glass-card-light p-3 text-center"
            >
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pb-24 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {active === "students" && <StudentManager students={students} setStudents={updateStudents} />}
            {active === "picker" && <RandomPicker students={students} />}
            {active === "marks" && <MarksTracker students={students} setStudents={updateStudents} />}
            {active === "timetable" && <TimetableManager uid={uid} email={user?.email || ""} />}
            {active === "alerts" && <AlertsManager email={user?.email || ""} />}
            {active === "ai" && <AIAssistant />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="max-w-lg mx-auto px-4 pb-4">
          <div className="glass-card flex items-center justify-around p-1.5">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = active === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActive(tab.key)}
                  className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all ${
                    isActive ? "tab-active" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[9px] font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
