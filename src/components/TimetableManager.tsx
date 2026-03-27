import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Clock, Upload, X, Calendar, FileText, Loader2 } from "lucide-react";
import { ref, set, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { isAdmin } from "@/lib/roles";

const GEMINI_API_KEY = "AIzaSyB8_8qMsTNT4005TBBnBTmQQo1l8jtEAHU";

interface TimetableEntry {
  id: string;
  className: string;
  period: number;
  subject: string;
  startTime: string;
  endTime: string;
  day: string;
}

interface ExamEntry {
  id: string;
  subject: string;
  date: string;
  startTime: string;
  duration: number;
}

interface Props {
  uid: string;
  email: string;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

async function extractTimetableFromFile(file: File): Promise<TimetableEntry[]> {
  const base64 = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.readAsDataURL(file);
  });

  const mimeType = file.type || "image/jpeg";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inlineData: { mimeType, data: base64 }
            },
            {
              text: `Extract the timetable from this image/document. Return ONLY a JSON array of objects with these fields:
- className: string (class name like "10A", "9B", etc. Use "General" if not specified)
- period: number (period number, starting from 1)
- subject: string (subject name)
- startTime: string (HH:MM format, estimate if not shown: period 1=08:00-08:45, period 2=08:45-09:30, period 3=09:45-10:30, period 4=10:30-11:15, period 5=11:30-12:15, period 6=12:15-13:00, period 7=13:30-14:15, period 8=14:15-15:00)
- endTime: string (HH:MM format)
- day: string (one of: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday)

Return ONLY the JSON array, no markdown, no explanation. If you can't extract, return [].`
            }
          ]
        }]
      })
    }
  );

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
  
  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.map((entry: any, i: number) => ({
      id: `${Date.now()}_${i}`,
      className: entry.className || "General",
      period: entry.period || i + 1,
      subject: entry.subject || "Unknown",
      startTime: entry.startTime || "08:00",
      endTime: entry.endTime || "08:45",
      day: entry.day || "Monday",
    }));
  } catch {
    return [];
  }
}

async function extractExamsFromFile(file: File): Promise<ExamEntry[]> {
  const base64 = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.readAsDataURL(file);
  });

  const mimeType = file.type || "image/jpeg";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType, data: base64 } },
            {
              text: `Extract the exam schedule from this image/document. Return ONLY a JSON array of objects with:
- subject: string
- date: string (YYYY-MM-DD format)
- startTime: string (HH:MM format, default "09:00")
- duration: number (in minutes, default 180)

Return ONLY the JSON array, no markdown. If you can't extract, return [].`
            }
          ]
        }]
      })
    }
  );

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.map((e: any, i: number) => ({
      id: `${Date.now()}_${i}`,
      subject: e.subject || "Unknown",
      date: e.date || new Date().toISOString().split("T")[0],
      startTime: e.startTime || "09:00",
      duration: e.duration || 180,
    }));
  } catch {
    return [];
  }
}

const TimetableManager = ({ uid, email }: Props) => {
  const admin = isAdmin(email);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [exams, setExams] = useState<ExamEntry[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showExamAdd, setShowExamAdd] = useState(false);
  const [tab, setTab] = useState<"my" | "exam">("my");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const examFileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [className, setClassName] = useState("");
  const [period, setPeriod] = useState(1);
  const [subject, setSubject] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("08:45");
  const [day, setDay] = useState("Monday");

  // Exam form
  const [examSubject, setExamSubject] = useState("");
  const [examDate, setExamDate] = useState("");
  const [examStartTime, setExamStartTime] = useState("09:00");
  const [examDuration, setExamDuration] = useState(180);

  useEffect(() => {
    const ttRef = ref(db, `users/${uid}/timetable`);
    const unsub = onValue(ttRef, (snap) => {
      const data = snap.val();
      setTimetable(data ? Object.values(data) : []);
    });
    return () => unsub();
  }, [uid]);

  useEffect(() => {
    const examRef = ref(db, "examSchedule");
    const unsub = onValue(examRef, (snap) => {
      const data = snap.val();
      setExams(data ? Object.values(data) : []);
    });
    return () => unsub();
  }, []);

  const addEntry = () => {
    if (!className.trim() || !subject.trim()) return;
    const entry: TimetableEntry = {
      id: Date.now().toString(), className: className.trim(), period,
      subject: subject.trim(), startTime, endTime, day,
    };
    const updated = [...timetable, entry];
    set(ref(db, `users/${uid}/timetable`), Object.fromEntries(updated.map(e => [e.id, e])));
    setClassName(""); setSubject(""); setShowAdd(false);
  };

  const removeEntry = (id: string) => {
    const updated = timetable.filter(e => e.id !== id);
    set(ref(db, `users/${uid}/timetable`), updated.length ? Object.fromEntries(updated.map(e => [e.id, e])) : null);
  };

  const addExam = () => {
    if (!examSubject.trim() || !examDate) return;
    const entry: ExamEntry = {
      id: Date.now().toString(), subject: examSubject.trim(),
      date: examDate, startTime: examStartTime, duration: examDuration,
    };
    const updated = [...exams, entry];
    set(ref(db, "examSchedule"), Object.fromEntries(updated.map(e => [e.id, e])));
    setExamSubject(""); setExamDate(""); setShowExamAdd(false);
  };

  const removeExam = (id: string) => {
    const updated = exams.filter(e => e.id !== id);
    set(ref(db, "examSchedule"), updated.length ? Object.fromEntries(updated.map(e => [e.id, e])) : null);
  };

  const handleTimetableUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg("Scanning timetable with AI...");
    try {
      const entries = await extractTimetableFromFile(file);
      if (entries.length === 0) {
        setUploadMsg("Could not extract timetable. Try a clearer image.");
        setTimeout(() => setUploadMsg(""), 3000);
      } else {
        const updated = [...timetable, ...entries];
        set(ref(db, `users/${uid}/timetable`), Object.fromEntries(updated.map(e => [e.id, e])));
        setUploadMsg(`✅ Extracted ${entries.length} periods!`);
        setTimeout(() => setUploadMsg(""), 3000);
      }
    } catch {
      setUploadMsg("Upload failed. Please try again.");
      setTimeout(() => setUploadMsg(""), 3000);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExamUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg("Scanning exam schedule with AI...");
    try {
      const entries = await extractExamsFromFile(file);
      if (entries.length === 0) {
        setUploadMsg("Could not extract exams. Try a clearer image.");
        setTimeout(() => setUploadMsg(""), 3000);
      } else {
        const updated = [...exams, ...entries];
        set(ref(db, "examSchedule"), Object.fromEntries(updated.map(e => [e.id, e])));
        setUploadMsg(`✅ Extracted ${entries.length} exams!`);
        setTimeout(() => setUploadMsg(""), 3000);
      }
    } catch {
      setUploadMsg("Upload failed. Please try again.");
      setTimeout(() => setUploadMsg(""), 3000);
    }
    setUploading(false);
    if (examFileInputRef.current) examFileInputRef.current.value = "";
  };

  const currentPeriod = useMemo(() => {
    const now = new Date();
    const dayName = DAYS[now.getDay() - 1];
    if (!dayName) return null;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return timetable.find(e => {
      if (e.day !== dayName) return false;
      const [sh, sm] = e.startTime.split(":").map(Number);
      const [eh, em] = e.endTime.split(":").map(Number);
      return nowMinutes >= sh * 60 + sm && nowMinutes < eh * 60 + em;
    }) || null;
  }, [timetable]);

  const todayEntries = useMemo(() => {
    const now = new Date();
    const dayName = DAYS[now.getDay() - 1];
    if (!dayName) return [];
    return timetable.filter(e => e.day === dayName).sort((a, b) => a.period - b.period);
  }, [timetable]);

  const inputClass = "py-2 px-3 rounded-lg bg-muted/50 border border-border text-foreground text-sm";

  return (
    <div className="space-y-4">
      {/* Upload status */}
      <AnimatePresence>
        {uploadMsg && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="p-3 rounded-xl bg-primary/20 border border-primary/30 flex items-center gap-2 text-sm text-foreground"
          >
            {uploading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
            <span>{uploadMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current Period Banner */}
      {currentPeriod && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl bg-primary/20 border border-primary/30 flex items-center gap-3"
        >
          <Clock className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs text-primary font-semibold">Current Period</p>
            <p className="text-sm text-foreground font-bold">
              {currentPeriod.subject} — {currentPeriod.className} (Period {currentPeriod.period})
            </p>
          </div>
        </motion.div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-2">
        <button onClick={() => setTab("my")}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${tab === "my" ? "tab-active" : "glass-card-light text-muted-foreground"}`}>
          My Timetable
        </button>
        <button onClick={() => setTab("exam")}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${tab === "exam" ? "tab-active" : "glass-card-light text-muted-foreground"}`}>
          Exam Schedule
        </button>
      </div>

      {tab === "my" && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">Timetable</h2>
              <p className="text-xs text-muted-foreground">{todayEntries.length} classes today</p>
            </div>
            <div className="flex gap-2">
              <input type="file" ref={fileInputRef} accept="image/*,.pdf" className="hidden" onChange={handleTimetableUpload} />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="glass-card-light p-2.5 rounded-xl text-primary hover:bg-primary/10 disabled:opacity-40">
                <Upload className="w-5 h-5" />
              </button>
              <button onClick={() => setShowAdd(true)} className="btn-primary p-2.5 rounded-xl">
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showAdd && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="glass-card-light p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Add Period</p>
                  <button onClick={() => setShowAdd(false)} className="text-muted-foreground"><X className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select value={day} onChange={e => setDay(e.target.value)} className={inputClass}>
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <input type="number" min="1" max="10" value={period} onChange={e => setPeriod(Number(e.target.value))} placeholder="Period" className={inputClass} />
                  <input value={className} onChange={e => setClassName(e.target.value)} placeholder="Class (e.g. 10A)" className={inputClass} />
                  <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" className={inputClass} />
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={inputClass} />
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className={inputClass} />
                </div>
                <button onClick={addEntry} className="btn-primary w-full py-2.5 text-sm rounded-lg">Add to Timetable</button>
              </motion.div>
            )}
          </AnimatePresence>

          {todayEntries.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground">Today's Schedule</p>
              {todayEntries.map((e, i) => (
                <motion.div key={e.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className={`glass-card-light p-3 flex items-center gap-3 ${currentPeriod?.id === e.id ? "ring-1 ring-primary" : ""}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">P{e.period}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{e.subject}</p>
                    <p className="text-[10px] text-muted-foreground">{e.className} · {e.startTime}-{e.endTime}</p>
                  </div>
                  <button onClick={() => removeEntry(e.id)} className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                </motion.div>
              ))}
            </div>
          )}

          {DAYS.filter(d => timetable.some(e => e.day === d)).map(d => {
            const dayEntries = timetable.filter(e => e.day === d).sort((a, b) => a.period - b.period);
            const now = new Date();
            if (DAYS[now.getDay() - 1] === d) return null;
            return (
              <div key={d} className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">{d}</p>
                {dayEntries.map(e => (
                  <div key={e.id} className="glass-card-light p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center text-secondary text-xs font-bold">P{e.period}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{e.subject}</p>
                      <p className="text-[10px] text-muted-foreground">{e.className} · {e.startTime}-{e.endTime}</p>
                    </div>
                    <button onClick={() => removeEntry(e.id)} className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            );
          })}

          {timetable.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
              No timetable entries yet.<br />Tap <strong>Upload</strong> to scan a timetable image, or <strong>+</strong> to add manually.
            </div>
          )}
        </>
      )}

      {tab === "exam" && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">Exam Schedule</h2>
              <p className="text-xs text-muted-foreground">{admin ? "Admin · You can add exams" : "View only"}</p>
            </div>
            {admin && (
              <div className="flex gap-2">
                <input type="file" ref={examFileInputRef} accept="image/*,.pdf" className="hidden" onChange={handleExamUpload} />
                <button onClick={() => examFileInputRef.current?.click()} disabled={uploading}
                  className="glass-card-light p-2.5 rounded-xl text-primary hover:bg-primary/10 disabled:opacity-40">
                  <Upload className="w-5 h-5" />
                </button>
                <button onClick={() => setShowExamAdd(true)} className="btn-primary p-2.5 rounded-xl">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          <AnimatePresence>
            {showExamAdd && admin && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="glass-card-light p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Add Exam</p>
                  <button onClick={() => setShowExamAdd(false)} className="text-muted-foreground"><X className="w-4 h-4" /></button>
                </div>
                <input value={examSubject} onChange={e => setExamSubject(e.target.value)} placeholder="Subject" className={`w-full ${inputClass}`} />
                <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} className={`w-full ${inputClass}`} />
                <div className="grid grid-cols-2 gap-2">
                  <input type="time" value={examStartTime} onChange={e => setExamStartTime(e.target.value)} className={inputClass} />
                  <input type="number" min="30" max="300" value={examDuration} onChange={e => setExamDuration(Number(e.target.value))} placeholder="Duration (min)" className={inputClass} />
                </div>
                <button onClick={addExam} className="btn-primary w-full py-2.5 text-sm rounded-lg">Add Exam</button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            {exams.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((e, i) => {
              const examDate = new Date(e.date);
              const now = new Date();
              const diffDays = Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              const isPast = diffDays < 0;
              const isToday = diffDays === 0;
              return (
                <motion.div key={e.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className={`glass-card-light p-3 flex items-center gap-3 ${isPast ? "opacity-60" : ""}`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold ${
                    isPast ? "bg-success/20 text-success" : isToday ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"
                  }`}>
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{e.subject}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {e.startTime} · {e.duration}min
                    </p>
                  </div>
                  <div className="text-right">
                    {isPast ? (
                      <span className="text-[10px] bg-success/20 text-success px-2 py-0.5 rounded-md">Done ✅</span>
                    ) : isToday ? (
                      <span className="text-[10px] bg-destructive/20 text-destructive px-2 py-0.5 rounded-md">Today!</span>
                    ) : (
                      <span className="text-[10px] bg-warning/20 text-warning px-2 py-0.5 rounded-md">{diffDays}d left</span>
                    )}
                  </div>
                  {admin && (
                    <button onClick={() => removeExam(e.id)} className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                  )}
                </motion.div>
              );
            })}
            {exams.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">No exams scheduled yet.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default TimetableManager;
