import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, ArrowRight } from "lucide-react";

interface ScheduleSlot {
  label: string;
  start: string; // HH:MM
  end: string;
  type: "assembly" | "period" | "break";
}

const DEFAULT_SCHEDULE: ScheduleSlot[] = [
  { label: "Assembly (Prayer)", start: "08:30", end: "08:50", type: "assembly" },
  { label: "1st Period", start: "08:50", end: "09:30", type: "period" },
  { label: "2nd Period", start: "09:30", end: "10:10", type: "period" },
  { label: "Snack Break", start: "10:10", end: "10:20", type: "break" },
  { label: "3rd Period", start: "10:20", end: "11:00", type: "period" },
  { label: "4th Period", start: "11:00", end: "11:40", type: "period" },
  { label: "Lunch Break", start: "11:40", end: "12:00", type: "break" },
  { label: "5th Period", start: "12:00", end: "12:40", type: "period" },
  { label: "6th Period", start: "12:40", end: "13:20", type: "period" },
  { label: "7th Period", start: "13:20", end: "14:00", type: "period" },
  { label: "8th Period", start: "14:00", end: "14:40", type: "period" },
];

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const formatMins = (mins: number) => {
  if (mins < 1) return "< 1 min";
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

interface TimetableEntry {
  id: string;
  period: number;
  subject: string;
  startTime: string;
  endTime: string;
  day: string;
}

interface Props {
  timetable?: TimetableEntry[];
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const PeriodTracker = ({ timetable = [] }: Props) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(interval);
  }, []);

  const nowMins = now.getHours() * 60 + now.getMinutes();
  const dayName = DAYS[now.getDay() - 1];

  const todaySubjects = useMemo(() => {
    if (!dayName) return {};
    const map: Record<number, string> = {};
    timetable
      .filter(e => e.day === dayName)
      .sort((a, b) => a.period - b.period)
      .forEach(e => { map[e.period] = e.subject; });
    return map;
  }, [timetable, dayName]);

  const currentIdx = DEFAULT_SCHEDULE.findIndex(
    s => nowMins >= toMinutes(s.start) && nowMins < toMinutes(s.end)
  );

  const current = currentIdx >= 0 ? DEFAULT_SCHEDULE[currentIdx] : null;
  const next = currentIdx >= 0 && currentIdx < DEFAULT_SCHEDULE.length - 1
    ? DEFAULT_SCHEDULE[currentIdx + 1]
    : currentIdx < 0 && nowMins < toMinutes(DEFAULT_SCHEDULE[0].start)
    ? DEFAULT_SCHEDULE[0]
    : null;

  const timeLeft = current ? toMinutes(current.end) - nowMins : 0;

  // Get period number from label
  const getPeriodNum = (label: string): number | null => {
    const match = label.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  };

  const currentSubject = current ? todaySubjects[getPeriodNum(current.label) || 0] : null;
  const nextPeriodNum = next ? getPeriodNum(next.label) : null;
  const nextSubject = nextPeriodNum ? todaySubjects[nextPeriodNum] : null;

  if (!dayName) {
    return (
      <div className="glass-card-light p-4 text-center">
        <p className="text-sm text-muted-foreground">🎉 It's the weekend!</p>
      </div>
    );
  }

  const schoolEnd = toMinutes("14:40");
  const schoolStart = toMinutes("08:30");

  if (nowMins >= schoolEnd) {
    return (
      <div className="glass-card-light p-4 text-center">
        <p className="text-sm text-muted-foreground">🏠 School day is over!</p>
      </div>
    );
  }

  if (nowMins < schoolStart) {
    const minsUntil = schoolStart - nowMins;
    return (
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card-light p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Clock className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">School starts in</p>
          <p className="text-sm font-bold text-foreground">{formatMins(minsUntil)}</p>
        </div>
      </motion.div>
    );
  }

  const progress = current ? ((toMinutes(current.end) - toMinutes(current.start) - timeLeft) / (toMinutes(current.end) - toMinutes(current.start))) * 100 : 0;

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      className="space-y-2">
      {current && (
        <div className={`p-4 rounded-2xl ${
          current.type === "break" ? "bg-warning/10 border border-warning/20" :
          current.type === "assembly" ? "bg-accent/10 border border-accent/20" :
          "bg-primary/10 border border-primary/20"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              current.type === "break" ? "bg-warning/20" :
              current.type === "assembly" ? "bg-accent/20" : "bg-primary/20"
            }`}>
              <Clock className={`w-5 h-5 ${
                current.type === "break" ? "text-warning" :
                current.type === "assembly" ? "text-accent" : "text-primary"
              }`} />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Now</p>
              <p className="text-sm font-bold text-foreground">
                {currentSubject || current.label}
              </p>
              {currentSubject && (
                <p className="text-[10px] text-muted-foreground">{current.label}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-foreground">{formatMins(timeLeft)}</p>
              <p className="text-[10px] text-muted-foreground">left</p>
            </div>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-muted/50 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                current.type === "break" ? "bg-warning" :
                current.type === "assembly" ? "bg-accent" : "bg-primary"
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      {next && (
        <div className="glass-card-light p-3 flex items-center gap-3">
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-[10px] text-muted-foreground">Up next</p>
            <p className="text-xs font-medium text-foreground">
              {nextSubject || next.label}
              {nextSubject && <span className="text-muted-foreground"> · {next.label}</span>}
            </p>
          </div>
          <span className="text-[10px] text-muted-foreground">{next.start}</span>
        </div>
      )}
    </motion.div>
  );
};

export default PeriodTracker;
