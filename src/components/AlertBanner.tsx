import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Bell, CheckCircle, Calendar, X } from "lucide-react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";

interface Alert {
  id: string;
  title: string;
  message: string;
  type: "urgent" | "upcoming" | "completed" | "info";
}

interface ExamEntry {
  id: string;
  subject: string;
  date: string;
}

const AlertBanner = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [exams, setExams] = useState<ExamEntry[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsub1 = onValue(ref(db, "alerts"), (snap) => {
      const data = snap.val();
      setAlerts(data ? Object.values(data) : []);
    });
    const unsub2 = onValue(ref(db, "examSchedule"), (snap) => {
      const data = snap.val();
      setExams(data ? Object.values(data) : []);
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  // Exam countdown alerts
  const examAlerts = exams.map(e => {
    const diff = Math.ceil((new Date(e.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return null;
    if (diff === 0) return { id: `exam-${e.id}`, title: `${e.subject} Exam Today!`, type: "urgent" as const };
    if (diff <= 7) return { id: `exam-${e.id}`, title: `${e.subject} exam in ${diff} day${diff > 1 ? "s" : ""}`, type: "upcoming" as const };
    return null;
  }).filter(Boolean);

  const urgentAlerts = alerts.filter(a => a.type === "urgent" && !dismissed.has(a.id));
  const allBanners = [...urgentAlerts.map(a => ({ id: a.id, title: a.title, type: a.type })), ...examAlerts];

  if (allBanners.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <AnimatePresence>
        {allBanners.slice(0, 2).map(b => (
          <motion.div
            key={b!.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`p-2.5 rounded-xl flex items-center gap-2 ${
              b!.type === "urgent" ? "alert-urgent" : "alert-upcoming"
            }`}
          >
            {b!.type === "urgent" ? <AlertTriangle className="w-4 h-4 text-destructive" /> : <Calendar className="w-4 h-4 text-warning" />}
            <p className="flex-1 text-xs font-medium text-foreground">{b!.title}</p>
            <button onClick={() => setDismissed(prev => new Set([...prev, b!.id]))} className="text-muted-foreground">
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default AlertBanner;
