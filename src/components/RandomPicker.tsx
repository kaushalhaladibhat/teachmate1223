import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shuffle, RotateCcw } from "lucide-react";
import { Student } from "./StudentManager";

interface Props {
  students: Student[];
}

const RandomPicker = ({ students }: Props) => {
  const [picked, setPicked] = useState<Student | null>(null);
  const [used, setUsed] = useState<Set<string>>(new Set());
  const [spinning, setSpinning] = useState(false);

  const pick = useCallback(() => {
    const available = students.filter(s => !used.has(s.id));
    if (available.length === 0) return;

    setSpinning(true);
    setPicked(null);

    // Quick shuffle animation
    let count = 0;
    const interval = setInterval(() => {
      const rand = students[Math.floor(Math.random() * students.length)];
      setPicked(rand);
      count++;
      if (count > 10) {
        clearInterval(interval);
        const final = available[Math.floor(Math.random() * available.length)];
        setPicked(final);
        setUsed(prev => new Set([...prev, final.id]));
        setSpinning(false);
      }
    }, 80);
  }, [students, used]);

  const reset = () => {
    setUsed(new Set());
    setPicked(null);
  };

  const available = students.filter(s => !used.has(s.id)).length;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-bold text-foreground">Random Picker</h2>
        <p className="text-xs text-muted-foreground">{available} of {students.length} remaining</p>
      </div>

      <div className="glass-card p-8 text-center min-h-[160px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          {picked ? (
            <motion.div
              key={picked.id + (spinning ? "spin" : "done")}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <p className={`text-3xl font-bold ${spinning ? "text-muted-foreground" : "gradient-text"}`}>
                {picked.name}
              </p>
              {!spinning && <p className="text-xs text-muted-foreground mt-2">🎯 Selected!</p>}
            </motion.div>
          ) : (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-muted-foreground text-sm"
            >
              {students.length === 0 ? "Add students first" : "Tap shuffle to pick a student"}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="flex gap-3">
        <button
          onClick={pick}
          disabled={available === 0 || spinning || students.length === 0}
          className="btn-primary flex-1 py-3.5 flex items-center justify-center gap-2 text-sm disabled:opacity-40"
        >
          <Shuffle className={`w-5 h-5 ${spinning ? "animate-spin" : ""}`} />
          {spinning ? "Picking..." : "Shuffle"}
        </button>
        <button
          onClick={reset}
          className="glass-card-light px-4 py-3.5 flex items-center justify-center gap-2 text-sm text-foreground"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      </div>

      {used.size > 0 && (
        <div className="glass-card-light p-4">
          <p className="text-xs text-muted-foreground mb-2">Already picked:</p>
          <div className="flex flex-wrap gap-1.5">
            {students.filter(s => used.has(s.id)).map(s => (
              <span key={s.id} className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-md">{s.name}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RandomPicker;
