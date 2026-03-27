import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Plus, Trash2, X, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { ref, set, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { isAdmin } from "@/lib/roles";

interface Alert {
  id: string;
  title: string;
  message: string;
  type: "urgent" | "upcoming" | "completed" | "info";
  createdAt: string;
  createdBy: string;
}

interface Props {
  email: string;
}

const typeConfig = {
  urgent: { bg: "alert-urgent", icon: AlertTriangle, color: "text-destructive", label: "Urgent" },
  upcoming: { bg: "alert-upcoming", icon: Bell, color: "text-warning", label: "Upcoming" },
  completed: { bg: "alert-completed", icon: CheckCircle, color: "text-success", label: "Completed" },
  info: { bg: "glass-card-light", icon: Info, color: "text-primary", label: "Info" },
};

const AlertsManager = ({ email }: Props) => {
  const admin = isAdmin(email);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<Alert["type"]>("info");

  useEffect(() => {
    const alertRef = ref(db, "alerts");
    const unsub = onValue(alertRef, (snap) => {
      const data = snap.val();
      if (data) {
        const list: Alert[] = Object.values(data);
        setAlerts(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } else {
        setAlerts([]);
      }
    });
    return () => unsub();
  }, []);

  const addAlert = () => {
    if (!title.trim() || !message.trim()) return;
    const alert: Alert = {
      id: Date.now().toString(),
      title: title.trim(),
      message: message.trim(),
      type,
      createdAt: new Date().toISOString(),
      createdBy: email,
    };
    const updated = [...alerts, alert];
    set(ref(db, "alerts"), Object.fromEntries(updated.map(a => [a.id, a])));
    setTitle("");
    setMessage("");
    setShowAdd(false);
  };

  const removeAlert = (id: string) => {
    const updated = alerts.filter(a => a.id !== id);
    set(ref(db, "alerts"), updated.length ? Object.fromEntries(updated.map(a => [a.id, a])) : null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Alerts</h2>
          <p className="text-xs text-muted-foreground">
            {admin ? "Admin · Broadcast alerts to all teachers" : `${alerts.length} active alerts`}
          </p>
        </div>
        {admin && (
          <button onClick={() => setShowAdd(true)} className="btn-primary p-2.5 rounded-xl">
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showAdd && admin && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card-light p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">New Alert</p>
              <button onClick={() => setShowAdd(false)} className="text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Alert title"
              className="w-full py-2 px-3 rounded-lg bg-muted/50 border border-border text-foreground text-sm" />
            <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Alert message"
              rows={2}
              className="w-full py-2 px-3 rounded-lg bg-muted/50 border border-border text-foreground text-sm resize-none" />
            <div className="grid grid-cols-4 gap-1.5">
              {(["urgent", "upcoming", "completed", "info"] as const).map(t => (
                <button key={t} onClick={() => setType(t)}
                  className={`py-1.5 text-[10px] font-semibold rounded-lg transition-all ${type === t ? "tab-active" : "glass-card-light text-muted-foreground"}`}
                >
                  {typeConfig[t].label}
                </button>
              ))}
            </div>
            <button onClick={addAlert} className="btn-primary w-full py-2.5 text-sm rounded-lg">Broadcast Alert</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        {alerts.map((a, i) => {
          const config = typeConfig[a.type];
          const Icon = config.icon;
          return (
            <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className={`${config.bg} p-3 rounded-xl flex items-start gap-3`}
            >
              <Icon className={`w-5 h-5 ${config.color} flex-shrink-0 mt-0.5`} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{a.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.message}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </p>
              </div>
              {admin && (
                <button onClick={() => removeAlert(a.id)} className="p-1.5 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          );
        })}
        {alerts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No alerts yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsManager;
