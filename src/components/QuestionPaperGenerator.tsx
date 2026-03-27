import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileUp, FileDown, Loader2, Settings, X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const GEMINI_API_KEY = "AIzaSyB8_8qMsTNT4005TBBnBTmQQo1l8jtEAHU";

interface QuestionPaperConfig {
  difficulty: "easy" | "medium" | "hard" | "mixed";
  mcqs: number;
  shortAnswer: number;
  longAnswer: number;
  fillBlanks: number;
  trueFalse: number;
  totalMarks: number;
  subject: string;
  className: string;
  timeAllowed: string;
  instructions: string;
}

const DEFAULT_CONFIG: QuestionPaperConfig = {
  difficulty: "medium",
  mcqs: 10,
  shortAnswer: 5,
  longAnswer: 3,
  fillBlanks: 5,
  trueFalse: 5,
  totalMarks: 80,
  subject: "",
  className: "",
  timeAllowed: "3 hours",
  instructions: "",
};

const QuestionPaperGenerator = () => {
  const [config, setConfig] = useState<QuestionPaperConfig>(DEFAULT_CONFIG);
  const [showConfig, setShowConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [generatedPaper, setGeneratedPaper] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadedText, setUploadedText] = useState("");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("Reading file...");

    // For images/PDFs, use Gemini to extract text
    if (file.type.startsWith("image/") || file.type === "application/pdf") {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(file);
      });

      setStatus("Extracting text with AI...");
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { inlineData: { mimeType: file.type || "image/jpeg", data: base64 } },
                  { text: "Extract ALL the text content from this textbook page/document. Return the full text content preserving structure. Include chapter names, headings, paragraphs, and all educational content." }
                ]
              }]
            })
          }
        );
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (text) {
          setUploadedText(text);
          setStatus(`✅ Extracted ${text.length} characters`);
        } else {
          setStatus("Could not extract text. Try a clearer image.");
        }
      } catch {
        setStatus("Extraction failed. Try again.");
      }
    } else {
      // Text file
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedText(reader.result as string);
        setStatus(`✅ Loaded ${file.name}`);
      };
      reader.readAsText(file);
    }

    setTimeout(() => setStatus(""), 3000);
    if (fileRef.current) fileRef.current.value = "";
  };

  const generatePaper = async () => {
    if (!uploadedText) return;
    setLoading(true);
    setStatus("Generating question paper...");

    const prompt = `You are an expert teacher creating a question paper. Based on the following chapter/textbook content, generate a well-structured question paper.

TEXTBOOK CONTENT:
${uploadedText.slice(0, 15000)}

REQUIREMENTS:
- Subject: ${config.subject || "As per content"}
- Class: ${config.className || "As per content"}
- Difficulty: ${config.difficulty}
- MCQs: ${config.mcqs} questions
- Short Answer Questions (2-3 marks each): ${config.shortAnswer} questions
- Long Answer Questions (5 marks each): ${config.longAnswer} questions
- Fill in the Blanks: ${config.fillBlanks} questions
- True/False: ${config.trueFalse} questions
- Total Marks: ${config.totalMarks}
- Time Allowed: ${config.timeAllowed}
${config.instructions ? `- Additional Instructions: ${config.instructions}` : ""}

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:

SECTION A: MULTIPLE CHOICE QUESTIONS (1 mark each)
Q1. [question]
a) [option] b) [option] c) [option] d) [option]
Answer: [letter]

SECTION B: FILL IN THE BLANKS (1 mark each)
Q[n]. [sentence with ______]
Answer: [answer]

SECTION C: TRUE OR FALSE (1 mark each)
Q[n]. [statement]
Answer: [True/False]

SECTION D: SHORT ANSWER QUESTIONS (2-3 marks each)
Q[n]. [question]

SECTION E: LONG ANSWER QUESTIONS (5 marks each)
Q[n]. [question]

ANSWER KEY:
[All answers listed]

Make questions educational, varied in difficulty as specified, and strictly based on the provided content.`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      );
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (text) {
        setGeneratedPaper(text);
        setStatus("✅ Question paper generated!");
      } else {
        setStatus("Failed to generate. Try again.");
      }
    } catch {
      setStatus("Generation failed. Check your connection.");
    }
    setLoading(false);
    setTimeout(() => setStatus(""), 3000);
  };

  const downloadPDF = () => {
    if (!generatedPaper) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(config.subject || "Question Paper", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    if (config.className) doc.text(`Class: ${config.className}`, 20, 30);
    doc.text(`Time Allowed: ${config.timeAllowed}`, pageWidth - 20, 30, { align: "right" });
    doc.text(`Maximum Marks: ${config.totalMarks}`, pageWidth - 20, 36, { align: "right" });

    doc.setDrawColor(0, 150, 200);
    doc.line(20, 40, pageWidth - 20, 40);

    // Split paper content into lines
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(generatedPaper, pageWidth - 40);
    let y = 50;

    for (const line of lines) {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }

      // Bold section headers
      if (line.startsWith("SECTION") || line.startsWith("ANSWER KEY")) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        y += 4;
      } else if (line.match(/^Q\d+/)) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
      }

      doc.text(line, 20, y);
      y += 5;
    }

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`Generated by TeachMate on ${new Date().toLocaleDateString("en-IN")}`, pageWidth / 2, 290, { align: "center" });

    doc.save(`Question_Paper_${config.subject || "Paper"}.pdf`);
  };

  const inputClass = "py-2 px-3 rounded-lg bg-muted/50 border border-border text-foreground text-sm w-full";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Question Paper</h2>
          <p className="text-xs text-muted-foreground">Upload content → AI generates paper</p>
        </div>
        <button onClick={() => setShowConfig(!showConfig)}
          className="glass-card-light p-2.5 rounded-xl text-muted-foreground">
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Config Panel */}
      <AnimatePresence>
        {showConfig && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="glass-card-light p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Paper Settings</p>
              <button onClick={() => setShowConfig(false)} className="text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={config.subject} onChange={e => setConfig({ ...config, subject: e.target.value })} placeholder="Subject" className={inputClass} />
              <input value={config.className} onChange={e => setConfig({ ...config, className: e.target.value })} placeholder="Class" className={inputClass} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Difficulty</p>
              <div className="flex gap-1.5">
                {(["easy", "medium", "hard", "mixed"] as const).map(d => (
                  <button key={d} onClick={() => setConfig({ ...config, difficulty: d })}
                    className={`flex-1 py-1.5 text-xs rounded-lg capitalize ${config.difficulty === d ? "btn-primary" : "bg-muted/50 text-muted-foreground"}`}
                  >{d}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">MCQs</label>
                <input type="number" min="0" value={config.mcqs} onChange={e => setConfig({ ...config, mcqs: Number(e.target.value) })} className={inputClass} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Short Ans</label>
                <input type="number" min="0" value={config.shortAnswer} onChange={e => setConfig({ ...config, shortAnswer: Number(e.target.value) })} className={inputClass} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Long Ans</label>
                <input type="number" min="0" value={config.longAnswer} onChange={e => setConfig({ ...config, longAnswer: Number(e.target.value) })} className={inputClass} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Fill Blanks</label>
                <input type="number" min="0" value={config.fillBlanks} onChange={e => setConfig({ ...config, fillBlanks: Number(e.target.value) })} className={inputClass} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">True/False</label>
                <input type="number" min="0" value={config.trueFalse} onChange={e => setConfig({ ...config, trueFalse: Number(e.target.value) })} className={inputClass} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Total Marks</label>
                <input type="number" min="1" value={config.totalMarks} onChange={e => setConfig({ ...config, totalMarks: Number(e.target.value) })} className={inputClass} />
              </div>
            </div>
            <input value={config.timeAllowed} onChange={e => setConfig({ ...config, timeAllowed: e.target.value })} placeholder="Time (e.g. 3 hours)" className={inputClass} />
            <input value={config.instructions} onChange={e => setConfig({ ...config, instructions: e.target.value })} placeholder="Additional instructions (optional)" className={inputClass} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status */}
      <AnimatePresence>
        {status && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="p-3 rounded-xl bg-primary/20 border border-primary/30 flex items-center gap-2 text-sm text-foreground">
            {loading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
            <span>{status}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload */}
      <input type="file" ref={fileRef} accept="image/*,.pdf,.txt,.doc,.docx" className="hidden" onChange={handleFileUpload} />
      <button onClick={() => fileRef.current?.click()} disabled={loading}
        className="w-full glass-card-light p-6 flex flex-col items-center gap-2 text-muted-foreground hover:text-primary hover:border-primary/30 transition-all disabled:opacity-40">
        <FileUp className="w-8 h-8" />
        <span className="text-sm font-medium">{uploadedText ? "📄 Content loaded · Tap to replace" : "Upload textbook page / chapter"}</span>
        <span className="text-[10px]">Image, PDF, or text file</span>
      </button>

      {/* Generate Button */}
      {uploadedText && (
        <button onClick={generatePaper} disabled={loading}
          className="btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-2 disabled:opacity-40">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {loading ? "Generating..." : "🧠 Generate Question Paper"}
        </button>
      )}

      {/* Generated Paper Preview */}
      {generatedPaper && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">Generated Paper</p>
            <button onClick={downloadPDF} className="btn-primary px-3 py-2 text-xs rounded-xl flex items-center gap-1.5">
              <FileDown className="w-4 h-4" /> Download PDF
            </button>
          </div>
          <div className="glass-card-light p-4 max-h-[400px] overflow-y-auto">
            <pre className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed">{generatedPaper}</pre>
          </div>
        </div>
      )}

      {!uploadedText && !generatedPaper && (
        <div className="text-center py-6 text-muted-foreground text-sm space-y-2">
          <p>📝 How it works:</p>
          <p className="text-xs">1. Upload a textbook chapter (image/PDF/text)</p>
          <p className="text-xs">2. Configure difficulty, question types & marks</p>
          <p className="text-xs">3. AI generates a complete question paper</p>
          <p className="text-xs">4. Download as PDF & share with students</p>
        </div>
      )}
    </div>
  );
};

export default QuestionPaperGenerator;
