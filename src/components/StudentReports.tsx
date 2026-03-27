import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileDown, ChevronDown, ChevronUp, Star } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Student } from "./StudentManager";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const DISCIPLINE_GRADES = ["A1", "A2", "B1", "B2", "C1", "C2", "D1", "D2", "E"];

interface TestScore {
  testName: string;
  score: number;
  maxScore: number;
}

interface StudentReport {
  disciplineGrade: string;
  tests: TestScore[];
}

interface Props {
  students: Student[];
  setStudents: (s: Student[]) => void;
  reports: Record<string, StudentReport>;
  setReports: (r: Record<string, StudentReport>) => void;
}

const getTag = (avg: number, disciplineGrade: string): { label: string; emoji: string; color: string } => {
  const dgIndex = DISCIPLINE_GRADES.indexOf(disciplineGrade);
  const goodDiscipline = dgIndex >= 0 && dgIndex <= 2;
  if (avg >= 70 && goodDiscipline) return { label: "Active", emoji: "🟢", color: "text-success" };
  if (avg >= 40) return { label: "Average", emoji: "🟡", color: "text-warning" };
  return { label: "Needs Attention", emoji: "🔴", color: "text-destructive" };
};

const StudentReports = ({ students, setStudents, reports, setReports }: Props) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [addTest, setAddTest] = useState<{ studentId: string; name: string; score: string; max: string } | null>(null);

  const getReport = (id: string): StudentReport => reports[id] || { disciplineGrade: "B1", tests: [] };

  const updateReport = (id: string, report: StudentReport) => {
    setReports({ ...reports, [id]: report });
  };

  const addTestScore = (studentId: string) => {
    if (!addTest || !addTest.name.trim()) return;
    const report = getReport(studentId);
    const score = Math.max(0, Number(addTest.score) || 0);
    const max = Math.max(1, Number(addTest.max) || 100);
    report.tests.push({ testName: addTest.name.trim(), score: Math.min(score, max), maxScore: max });
    updateReport(studentId, { ...report });
    setAddTest(null);
  };

  const removeTest = (studentId: string, idx: number) => {
    const report = getReport(studentId);
    report.tests.splice(idx, 1);
    updateReport(studentId, { ...report });
  };

  const getAvg = (id: string) => {
    const r = getReport(id);
    if (r.tests.length === 0) return 0;
    return r.tests.reduce((sum, t) => sum + (t.score / t.maxScore) * 100, 0) / r.tests.length;
  };

  // Bar chart data
  const chartData = students.map(s => ({
    name: s.name.length > 8 ? s.name.slice(0, 8) + "…" : s.name,
    avg: Math.round(getAvg(s.id)),
  }));

  const downloadPDF = (student: Student) => {
    const report = getReport(student.id);
    const avg = getAvg(student.id);
    const tag = getTag(avg, report.disciplineGrade);
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Student Report Card", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("TeachMate · Generated Report", 105, 28, { align: "center" });

    doc.setDrawColor(0, 150, 200);
    doc.line(20, 35, 190, 35);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Name: ${student.name}`, 20, 48);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Discipline Grade: ${report.disciplineGrade}`, 20, 58);
    doc.text(`Overall Average: ${avg.toFixed(1)}%`, 20, 66);
    doc.text(`Status: ${tag.emoji} ${tag.label}`, 20, 74);
    doc.text(`Attendance: ${student.present ? "Present" : "Absent"}`, 20, 82);

    if (report.tests.length > 0) {
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Test Scores", 20, 98);

      autoTable(doc, {
        startY: 104,
        head: [["Test Name", "Score", "Max", "Percentage"]],
        body: report.tests.map(t => [
          t.testName,
          t.score.toString(),
          t.maxScore.toString(),
          `${((t.score / t.maxScore) * 100).toFixed(1)}%`
        ]),
        theme: "grid",
        headStyles: { fillColor: [0, 150, 200], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [240, 248, 255] },
      });
    }

    const finalY = (doc as any).lastAutoTable?.finalY || 110;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Generated on ${new Date().toLocaleDateString("en-IN")} by TeachMate`, 105, finalY + 20, { align: "center" });

    doc.save(`${student.name}_Report.pdf`);
  };

  const downloadAllPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Class Report - All Students", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on ${new Date().toLocaleDateString("en-IN")}`, 105, 28, { align: "center" });

    autoTable(doc, {
      startY: 40,
      head: [["Name", "Avg %", "Discipline", "Tag", "Attendance"]],
      body: students.map(s => {
        const avg = getAvg(s.id);
        const r = getReport(s.id);
        const tag = getTag(avg, r.disciplineGrade);
        return [s.name, `${avg.toFixed(1)}%`, r.disciplineGrade, tag.label, s.present ? "Present" : "Absent"];
      }),
      theme: "grid",
      headStyles: { fillColor: [0, 150, 200], textColor: 255, fontStyle: "bold" },
    });

    doc.save("Class_Report.pdf");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Reports</h2>
          <p className="text-xs text-muted-foreground">{students.length} students</p>
        </div>
        {students.length > 0 && (
          <button onClick={downloadAllPDF} className="btn-primary px-3 py-2 text-xs rounded-xl flex items-center gap-1.5">
            <FileDown className="w-4 h-4" /> Class PDF
          </button>
        )}
      </div>

      {/* Bar Chart */}
      {chartData.length > 0 && (
        <div className="glass-card-light p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-3">Average Marks</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 30%, 22%)" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(215, 20%, 60%)" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "hsl(215, 20%, 60%)" }} />
              <Tooltip
                contentStyle={{ background: "hsl(230, 40%, 14%)", border: "1px solid hsl(230, 30%, 22%)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "hsl(210, 40%, 96%)" }}
              />
              <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.avg >= 70 ? "hsl(142, 70%, 45%)" : entry.avg >= 40 ? "hsl(38, 92%, 50%)" : "hsl(0, 84%, 60%)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Student Cards */}
      <div className="space-y-2">
        {students.map((s, i) => {
          const report = getReport(s.id);
          const avg = getAvg(s.id);
          const tag = getTag(avg, report.disciplineGrade);
          const isExpanded = expanded === s.id;

          return (
            <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <div
                onClick={() => setExpanded(isExpanded ? null : s.id)}
                className="glass-card-light p-3 flex items-center gap-3 cursor-pointer"
              >
                <span className="text-lg">{tag.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{s.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {tag.label} · Avg: {avg.toFixed(0)}% · Grade: {report.disciplineGrade}
                  </p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); downloadPDF(s); }}
                  className="p-1.5 text-primary hover:bg-primary/10 rounded-lg">
                  <FileDown className="w-4 h-4" />
                </button>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="glass-card-light mt-1 p-4 space-y-3 rounded-t-none"
                  >
                    {/* Discipline Grade */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1.5">Discipline Grade</p>
                      <div className="flex flex-wrap gap-1.5">
                        {DISCIPLINE_GRADES.map(g => (
                          <button key={g}
                            onClick={() => updateReport(s.id, { ...report, disciplineGrade: g })}
                            className={`px-2.5 py-1 text-xs rounded-lg transition-all ${
                              report.disciplineGrade === g ? "btn-primary" : "bg-muted/50 text-muted-foreground"
                            }`}
                          >{g}</button>
                        ))}
                      </div>
                    </div>

                    {/* Test Scores */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs font-semibold text-muted-foreground">Test Scores</p>
                        <button onClick={() => setAddTest({ studentId: s.id, name: "", score: "", max: "100" })}
                          className="text-[10px] text-primary font-semibold">+ Add Test</button>
                      </div>

                      {addTest?.studentId === s.id && (
                        <div className="flex gap-1.5 mb-2">
                          <input value={addTest.name} onChange={e => setAddTest({ ...addTest, name: e.target.value })}
                            placeholder="Test name" className="flex-1 py-1.5 px-2 rounded-lg bg-muted/50 border border-border text-foreground text-xs" />
                          <input value={addTest.score} onChange={e => setAddTest({ ...addTest, score: e.target.value })}
                            placeholder="Score" type="number" className="w-14 py-1.5 px-2 rounded-lg bg-muted/50 border border-border text-foreground text-xs text-center" />
                          <input value={addTest.max} onChange={e => setAddTest({ ...addTest, max: e.target.value })}
                            placeholder="Max" type="number" className="w-14 py-1.5 px-2 rounded-lg bg-muted/50 border border-border text-foreground text-xs text-center" />
                          <button onClick={() => addTestScore(s.id)} className="btn-primary px-2 py-1.5 text-xs rounded-lg">✓</button>
                        </div>
                      )}

                      {report.tests.map((t, ti) => (
                        <div key={ti} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
                          <span className="flex-1 text-xs text-foreground">{t.testName}</span>
                          <span className="text-xs font-medium text-foreground">{t.score}/{t.maxScore}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            (t.score / t.maxScore) * 100 >= 70 ? "bg-success/20 text-success" :
                            (t.score / t.maxScore) * 100 >= 40 ? "bg-warning/20 text-warning" :
                            "bg-destructive/20 text-destructive"
                          }`}>{((t.score / t.maxScore) * 100).toFixed(0)}%</span>
                          <button onClick={() => removeTest(s.id, ti)} className="text-muted-foreground hover:text-destructive text-xs">✕</button>
                        </div>
                      ))}

                      {report.tests.length === 0 && (
                        <p className="text-[10px] text-muted-foreground py-2">No tests added yet</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {students.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Add students first to generate reports.
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentReports;
