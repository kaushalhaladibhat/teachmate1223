import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Users, Shuffle, BarChart3, Bot, LogOut } from "lucide-react";
import StudentManager, { Student } from "@/components/StudentManager";
import RandomPicker from "@/components/RandomPicker";
import MarksTracker from "@/components/MarksTracker";
import AIAssistant from "@/components/AIAssistant";

type Tab = "students" | "picker" | "marks" | "ai";

const tabs: { key: Tab; label: string; icon: typeof Users }[] = [
  { key: "students", label: "Students", icon: Users },
  { key: "picker", label: "Picker", icon: Shuffle },
  { key: "marks", label: "Marks", icon: BarChart3 },
  { key: "ai", label: "Nexus", icon: Bot },
];

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [active, setActive] = useState<Tab>("students");
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem("teachmate_students");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("teachmate_students", JSON.stringify(students));
  }, [students]);

  const firstName = user?.displayName?.split(" ")[0] || user?.email?.split("@")[0] || "Teacher";

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
          <h1 className="text-xl font-bold text-foreground">{firstName} 👋</h1>
        </div>
        <button onClick={logout} className="glass-card-light p-2.5 rounded-xl text-muted-foreground">
          <LogOut className="w-4 h-4" />
        </button>
      </motion.div>

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
            {active === "students" && <StudentManager students={students} setStudents={setStudents} />}
            {active === "picker" && <RandomPicker students={students} />}
            {active === "marks" && <MarksTracker students={students} setStudents={setStudents} />}
            {active === "ai" && <AIAssistant />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="max-w-lg mx-auto px-4 pb-4">
          <div className="glass-card flex items-center justify-around p-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = active === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActive(tab.key)}
                  className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all ${
                    isActive ? "tab-active" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{tab.label}</span>
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
