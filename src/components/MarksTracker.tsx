import { motion } from "framer-motion";
import { Student } from "./StudentManager";

interface Props {
  students: Student[];
  setStudents: (s: Student[]) => void;
}

const MarksTracker = ({ students, setStudents }: Props) => {
  const updateMarks = (id: string, marks: number) => {
    setStudents(students.map(s => s.id === id ? { ...s, marks } : s));
  };

  const avg = students.length > 0
    ? (students.reduce((sum, s) => sum + s.marks, 0) / students.length).toFixed(1)
    : "0";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Marks</h2>
          <p className="text-xs text-muted-foreground">Class average: {avg}</p>
        </div>
      </div>

      <div className="space-y-2">
        {students.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="glass-card-light p-3 flex items-center gap-3"
          >
            <span className="flex-1 text-sm font-medium text-foreground">{s.name}</span>
            <input
              type="number"
              min="0"
              max="100"
              value={s.marks}
              onChange={e => updateMarks(s.id, Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              className="w-20 py-1.5 px-3 text-center rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="w-16">
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: s.marks >= 70
                      ? "hsl(142, 70%, 45%)"
                      : s.marks >= 40
                      ? "hsl(38, 92%, 50%)"
                      : "hsl(0, 84%, 60%)",
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${s.marks}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </motion.div>
        ))}

        {students.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Add students first to track marks.
          </div>
        )}
      </div>
    </div>
  );
};

export default MarksTracker;
