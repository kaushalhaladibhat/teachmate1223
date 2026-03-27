import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, UserCheck, UserX, X } from "lucide-react";

export interface Student {
  id: string;
  name: string;
  present: boolean;
  marks: number;
}

interface Props {
  students: Student[];
  setStudents: (s: Student[]) => void;
}

const StudentManager = ({ students, setStudents }: Props) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");

  const addStudent = () => {
    if (!newName.trim()) return;
    const s: Student = { id: Date.now().toString(), name: newName.trim(), present: false, marks: 0 };
    setStudents([...students, s]);
    setNewName("");
    setShowAdd(false);
  };

  const toggleAttendance = (id: string) => {
    setStudents(students.map(s => s.id === id ? { ...s, present: !s.present } : s));
  };

  const removeStudent = (id: string) => {
    setStudents(students.filter(s => s.id !== id));
  };

  const presentCount = students.filter(s => s.present).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Students</h2>
          <p className="text-xs text-muted-foreground">
            {presentCount}/{students.length} present
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary p-2.5 rounded-xl">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card-light p-4 flex gap-2"
          >
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addStudent()}
              placeholder="Student name"
              className="flex-1 py-2 px-3 rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button onClick={addStudent} className="btn-primary px-4 py-2 text-sm rounded-lg">Add</button>
            <button onClick={() => setShowAdd(false)} className="p-2 text-muted-foreground"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        <AnimatePresence>
          {students.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: i * 0.03 }}
              className="glass-card-light p-3 flex items-center gap-3"
            >
              <button
                onClick={() => toggleAttendance(s.id)}
                className={`p-2 rounded-lg transition-all ${s.present ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}
              >
                {s.present ? <UserCheck className="w-5 h-5" /> : <UserX className="w-5 h-5" />}
              </button>
              <span className="flex-1 text-sm font-medium text-foreground">{s.name}</span>
              <span className={`text-xs font-semibold px-2 py-1 rounded-md ${s.present ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                {s.present ? "Present" : "Absent"}
              </span>
              <button onClick={() => removeStudent(s.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {students.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No students yet. Tap + to add one.
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentManager;
