import { useState, useRef, useCallback, useEffect } from "react";
import { PDFDocument, rgb, degrees, StandardFonts } from "https://cdn.skypack.dev/pdf-lib@1.17.1";

// ─── Design tokens ───────────────────────────────────────────────────────────
// Palette: deep navy bg, crisp white surface, electric blue accent, soft slate text
// Type: system-ui for utility; no decorative fonts needed for a tool app
// Signature: animated tool cards with a left-border accent that shifts color per category

const COLORS = {
  bg: "#0F1117",
  surface: "#1A1D27",
  surfaceHover: "#22263A",
  border: "#2A2F45",
  accent: "#4F8EF7",
  accentGreen: "#34D399",
  accentRed: "#F87171",
  accentYellow: "#FBBF24",
  accentPurple: "#A78BFA",
  text: "#E2E8F0",
  textMuted: "#7B8BB2",
  textDim: "#4A5580",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', system-ui, sans-serif;
    background: ${COLORS.bg};
    color: ${COLORS.text};
    min-height: 100vh;
  }

  .app { max-width: 480px; margin: 0 auto; padding: 0 0 80px; }

  /* Header */
  .header {
    padding: 20px 20px 16px;
    border-bottom: 1px solid ${COLORS.border};
    position: sticky; top: 0; z-index: 100;
    background: ${COLORS.bg};
  }
  .header-row { display: flex; align-items: center; gap: 10px; }
  .logo {
    width: 36px; height: 36px; border-radius: 10px;
    background: linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentPurple});
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
  }
  .header h1 { font-size: 20px; font-weight: 700; letter-spacing: -0.3px; }
  .header p { font-size: 12px; color: ${COLORS.textMuted}; margin-top: 2px; }

  /* Category tabs */
  .tabs {
    display: flex; gap: 6px; padding: 14px 16px 0;
    overflow-x: auto; scrollbar-width: none;
  }
  .tabs::-webkit-scrollbar { display: none; }
  .tab {
    flex-shrink: 0; padding: 6px 14px; border-radius: 20px;
    font-size: 12px; font-weight: 500; border: 1px solid ${COLORS.border};
    background: transparent; color: ${COLORS.textMuted};
    cursor: pointer; transition: all 0.15s;
  }
  .tab.active {
    background: ${COLORS.accent}20;
    border-color: ${COLORS.accent};
    color: ${COLORS.accent};
  }

  /* Tool grid */
  .section-label {
    font-size: 11px; font-weight: 600; letter-spacing: 0.8px;
    color: ${COLORS.textDim}; text-transform: uppercase;
    padding: 16px 20px 8px;
  }
  .tools { padding: 0 16px; display: flex; flex-direction: column; gap: 8px; }

  .tool-card {
    display: flex; align-items: center; gap: 14px;
    padding: 14px 16px; border-radius: 12px;
    background: ${COLORS.surface}; border: 1px solid ${COLORS.border};
    cursor: pointer; transition: all 0.15s; text-align: left;
  }
  .tool-card:hover {
    background: ${COLORS.surfaceHover};
    border-color: var(--accent-color, ${COLORS.accent});
    transform: translateY(-1px);
  }
  .tool-icon {
    width: 42px; height: 42px; border-radius: 10px;
    background: var(--accent-color, ${COLORS.accent})18;
    border: 1px solid var(--accent-color, ${COLORS.accent})30;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; flex-shrink: 0;
  }
  .tool-info { flex: 1; min-width: 0; }
  .tool-name { font-size: 14px; font-weight: 600; color: ${COLORS.text}; }
  .tool-desc { font-size: 12px; color: ${COLORS.textMuted}; margin-top: 2px; line-height: 1.4; }
  .tool-arrow { color: ${COLORS.textDim}; font-size: 16px; }

  /* Modal */
  .modal-overlay {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
    display: flex; align-items: flex-end;
  }
  .modal {
    width: 100%; max-height: 92vh; overflow-y: auto;
    background: ${COLORS.surface}; border-radius: 20px 20px 0 0;
    padding: 0 0 40px; animation: slideUp 0.25s ease-out;
  }
  @keyframes slideUp {
    from { transform: translateY(100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  .modal-handle {
    width: 36px; height: 4px; border-radius: 2px;
    background: ${COLORS.border}; margin: 12px auto 0;
  }
  .modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px 12px;
    border-bottom: 1px solid ${COLORS.border};
  }
  .modal-title { font-size: 16px; font-weight: 700; }
  .modal-close {
    width: 30px; height: 30px; border-radius: 50%;
    background: ${COLORS.border}; border: none;
    color: ${COLORS.text}; font-size: 16px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
  }
  .modal-body { padding: 20px; }

  /* Upload zone */
  .upload-zone {
    border: 2px dashed ${COLORS.border}; border-radius: 12px;
    padding: 32px 20px; text-align: center; cursor: pointer;
    transition: all 0.15s; margin-bottom: 16px;
  }
  .upload-zone:hover, .upload-zone.drag-over {
    border-color: ${COLORS.accent};
    background: ${COLORS.accent}08;
  }
  .upload-icon { font-size: 32px; margin-bottom: 8px; }
  .upload-text { font-size: 14px; font-weight: 500; color: ${COLORS.text}; }
  .upload-sub { font-size: 12px; color: ${COLORS.textMuted}; margin-top: 4px; }

  /* File list */
  .file-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
  .file-item {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px; background: ${COLORS.bg};
    border-radius: 8px; border: 1px solid ${COLORS.border};
  }
  .file-item-icon { font-size: 20px; }
  .file-item-name { flex: 1; font-size: 13px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .file-item-size { font-size: 11px; color: ${COLORS.textMuted}; }
  .file-remove {
    background: none; border: none; color: ${COLORS.textDim};
    cursor: pointer; font-size: 16px; padding: 2px 6px;
    border-radius: 4px; transition: color 0.15s;
  }
  .file-remove:hover { color: ${COLORS.accentRed}; }

  /* Drag handles for reorder */
  .drag-handle { cursor: grab; color: ${COLORS.textDim}; font-size: 14px; padding: 0 4px; }

  /* Btn */
  .btn {
    width: 100%; padding: 14px; border-radius: 12px;
    font-size: 15px; font-weight: 600; border: none;
    cursor: pointer; transition: all 0.15s; display: flex;
    align-items: center; justify-content: center; gap: 8px;
  }
  .btn-primary {
    background: ${COLORS.accent};
    color: #fff;
  }
  .btn-primary:hover { background: #3a7af0; }
  .btn-primary:disabled { background: ${COLORS.border}; color: ${COLORS.textDim}; cursor: not-allowed; }
  .btn-secondary {
    background: ${COLORS.border};
    color: ${COLORS.text}; margin-top: 8px;
  }

  /* Progress */
  .progress-bar {
    height: 4px; border-radius: 2px; background: ${COLORS.border};
    margin: 12px 0; overflow: hidden;
  }
  .progress-fill {
    height: 100%; background: ${COLORS.accent};
    border-radius: 2px; transition: width 0.3s;
  }

  /* Status */
  .status {
    padding: 10px 14px; border-radius: 8px;
    font-size: 13px; margin-bottom: 12px;
    display: flex; align-items: center; gap: 8px;
  }
  .status-success { background: ${COLORS.accentGreen}15; border: 1px solid ${COLORS.accentGreen}30; color: ${COLORS.accentGreen}; }
  .status-error { background: ${COLORS.accentRed}15; border: 1px solid ${COLORS.accentRed}30; color: ${COLORS.accentRed}; }
  .status-info { background: ${COLORS.accent}15; border: 1px solid ${COLORS.accent}30; color: ${COLORS.accent}; }

  /* Input */
  .input-group { margin-bottom: 14px; }
  .input-label { font-size: 12px; font-weight: 500; color: ${COLORS.textMuted}; margin-bottom: 6px; display: block; }
  .input {
    width: 100%; padding: 10px 12px; border-radius: 8px;
    background: ${COLORS.bg}; border: 1px solid ${COLORS.border};
    color: ${COLORS.text}; font-size: 14px; font-family: inherit;
  }
  .input:focus { outline: none; border-color: ${COLORS.accent}; }
  textarea.input { min-height: 120px; resize: vertical; font-family: 'Courier New', monospace; font-size: 12px; }

  /* Page thumb strip */
  .page-strip { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 14px; }
  .page-thumb {
    flex-shrink: 0; width: 70px; border-radius: 6px;
    border: 2px solid ${COLORS.border}; overflow: hidden;
    cursor: grab; transition: border-color 0.15s;
  }
  .page-thumb.selected { border-color: ${COLORS.accent}; }
  .page-thumb-num {
    text-align: center; font-size: 10px; color: ${COLORS.textMuted};
    padding: 3px 0; background: ${COLORS.bg};
  }
  canvas.thumb-canvas { width: 70px; display: block; }

  /* CloudConvert key input */
  .api-notice {
    font-size: 12px; color: ${COLORS.textMuted}; line-height: 1.5;
    padding: 10px 12px; background: ${COLORS.bg};
    border-radius: 8px; border: 1px solid ${COLORS.border};
    margin-bottom: 12px;
  }
  .api-notice a { color: ${COLORS.accent}; text-decoration: none; }
`;

// ─── Tools config ─────────────────────────────────────────────────────────────
const CATEGORIES = ["All", "Convert", "Edit", "Organize", "Security"];

const TOOLS = [
  // Convert
  { id: "merge", cat: "Organize", icon: "🔗", name: "Merge PDFs", desc: "Combine multiple PDFs into one", accent: COLORS.accent },
  { id: "split", cat: "Organize", icon: "✂️", name: "Split PDF", desc: "Extract pages into separate files", accent: COLORS.accent },
  { id: "reorder", cat: "Organize", icon: "↕️", name: "Reorder Pages", desc: "Drag pages to rearrange order", accent: COLORS.accent },
  { id: "rotate", cat: "Organize", icon: "🔄", name: "Rotate Pages", desc: "Rotate one or all pages", accent: COLORS.accent },
  { id: "compress", cat: "Organize", icon: "🗜️", name: "Compress PDF", desc: "Reduce file size", accent: COLORS.accent },
  { id: "watermark", cat: "Organize", icon: "💧", name: "Add Watermark", desc: "Stamp text watermark on pages", accent: COLORS.accent },
  { id: "pagenums", cat: "Organize", icon: "🔢", name: "Add Page Numbers", desc: "Insert numbers on every page", accent: COLORS.accent },
  { id: "img2pdf", cat: "Convert", icon: "🖼️", name: "Images → PDF", desc: "Convert JPG/PNG images to PDF", accent: COLORS.accentGreen },
  { id: "pdf2img", cat: "Convert", icon: "📷", name: "PDF → Images", desc: "Export each page as PNG", accent: COLORS.accentGreen },
  { id: "word2pdf", cat: "Convert", icon: "📝", name: "Word → PDF", desc: "Convert .docx file to PDF", accent: COLORS.accentGreen },
  { id: "pdf2word", cat: "Convert", icon: "📄", name: "PDF → Word", desc: "Convert PDF to editable .docx", accent: COLORS.accentGreen },
  { id: "latex2pdf", cat: "Convert", icon: "🧮", name: "LaTeX → PDF", desc: "Compile LaTeX code to PDF", accent: COLORS.accentPurple },
  { id: "pdf2latex", cat: "Convert", icon: "🔬", name: "PDF → LaTeX", desc: "Extract and edit LaTeX source", accent: COLORS.accentPurple },
  { id: "ppt2pdf", cat: "Convert", icon: "📊", name: "PPT → PDF", desc: "Convert .pptx presentation to PDF", accent: COLORS.accentGreen },
  { id: "pdf2ppt", cat: "Convert", icon: "🎞️", name: "PDF → PPT", desc: "Convert PDF to PowerPoint slides", accent: COLORS.accentGreen },
  { id: "edittext", cat: "Edit", icon: "✏️", name: "Edit Text (Visual)", desc: "Click on PDF to add & edit text live", accent: COLORS.accentYellow },
  { id: "protect", cat: "Security", icon: "🔒", name: "Protect PDF", desc: "Set a password on your PDF", accent: COLORS.accentRed },
  { id: "unlock", cat: "Security", icon: "🔓", name: "Unlock PDF", desc: "Remove password protection", accent: COLORS.accentRed },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

async function readFileAsArrayBuffer(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsArrayBuffer(file);
  });
}

async function readFileAsDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// CloudConvert API call
async function cloudConvertJob(apiKey, tasks, inputFile) {
  // 1. Create job
  const jobRes = await fetch("https://api.cloudconvert.com/v2/jobs", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ tasks })
  });
  if (!jobRes.ok) throw new Error("CloudConvert job creation failed");
  const job = await jobRes.json();

  // 2. Upload file
  const uploadTask = Object.values(job.data.tasks).find(t => t.name === "upload");
  const formData = new FormData();
  Object.entries(uploadTask.result.form.parameters).forEach(([k, v]) => formData.append(k, v));
  formData.append("file", inputFile);
  await fetch(uploadTask.result.form.url, { method: "POST", body: formData });

  // 3. Poll until done
  let done = false, resultUrl = null;
  for (let i = 0; i < 30 && !done; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const poll = await fetch(`https://api.cloudconvert.com/v2/jobs/${job.data.id}`, {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });
    const pollData = await poll.json();
    const exportTask = pollData.data.tasks.find(t => t.name === "export");
    if (exportTask?.status === "finished") {
      resultUrl = exportTask.result.files[0].url;
      done = true;
    }
    if (pollData.data.status === "error") throw new Error("Conversion failed");
  }
  if (!resultUrl) throw new Error("Timeout waiting for conversion");

  // 4. Download result
  const fileRes = await fetch(resultUrl);
  return await fileRes.blob();
}

// ─── Tool Modals ──────────────────────────────────────────────────────────────

function UploadZone({ accept, multiple, onFiles, label, sub }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef();
  return (
    <div
      className={`upload-zone${drag ? " drag-over" : ""}`}
      onClick={() => ref.current.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); onFiles([...e.dataTransfer.files]); }}
    >
      <input ref={ref} type="file" accept={accept} multiple={multiple} style={{ display: "none" }}
        onChange={e => onFiles([...e.target.files])} />
      <div className="upload-icon">📂</div>
      <div className="upload-text">{label || "Tap to upload"}</div>
      <div className="upload-sub">{sub || accept}</div>
    </div>
  );
}

function FileChip({ file, onRemove, handle }) {
  return (
    <div className="file-item">
      {handle && <span className="drag-handle">⠿</span>}
      <span className="file-item-icon">{file.name.endsWith(".pdf") ? "📄" : "🖼️"}</span>
      <span className="file-item-name">{file.name}</span>
      <span className="file-item-size">{fmtSize(file.size)}</span>
      <button className="file-remove" onClick={onRemove}>✕</button>
    </div>
  );
}

function StatusMsg({ type, msg }) {
  if (!msg) return null;
  const icons = { success: "✅", error: "❌", info: "⏳" };
  return <div className={`status status-${type}`}>{icons[type]} {msg}</div>;
}

// ── Merge ──
function MergeTool() {
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState(0);

  const addFiles = (f) => setFiles(prev => [...prev, ...f.filter(x => x.type === "application/pdf")]);
  const remove = (i) => setFiles(f => f.filter((_, j) => j !== i));

  const run = async () => {
    if (files.length < 2) return;
    setStatus({ type: "info", msg: "Merging PDFs…" }); setProgress(20);
    try {
      const merged = await PDFDocument.create();
      for (let i = 0; i < files.length; i++) {
        const buf = await readFileAsArrayBuffer(files[i]);
        const doc = await PDFDocument.load(buf);
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        pages.forEach(p => merged.addPage(p));
        setProgress(20 + Math.round((i + 1) / files.length * 70));
      }
      const bytes = await merged.save();
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), "merged.pdf");
      setStatus({ type: "success", msg: "Merged successfully! File downloaded." }); setProgress(100);
    } catch (e) { setStatus({ type: "error", msg: e.message }); }
  };

  return (
    <>
      <UploadZone accept=".pdf" multiple onFiles={addFiles} label="Upload PDF files" sub="Select 2 or more PDFs" />
      <div className="file-list">{files.map((f, i) => <FileChip key={i} file={f} handle onRemove={() => remove(i)} />)}</div>
      {status && <><StatusMsg {...status} /><div className="progress-bar"><div className="progress-fill" style={{ width: progress + "%" }} /></div></>}
      <button className="btn btn-primary" disabled={files.length < 2} onClick={run}>🔗 Merge PDFs</button>
    </>
  );
}

// ── Split ──
function SplitTool() {
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState("");
  const [status, setStatus] = useState(null);

  const run = async () => {
    setStatus({ type: "info", msg: "Splitting PDF…" });
    try {
      const buf = await readFileAsArrayBuffer(file);
      const src = await PDFDocument.load(buf);
      const total = src.getPageCount();
      const nums = pages.split(",").map(s => s.trim()).flatMap(s => {
        if (s.includes("-")) { const [a, b] = s.split("-").map(Number); return Array.from({ length: b - a + 1 }, (_, i) => a + i - 1); }
        return [parseInt(s) - 1];
      }).filter(n => n >= 0 && n < total);
      const out = await PDFDocument.create();
      const copied = await out.copyPages(src, nums);
      copied.forEach(p => out.addPage(p));
      const bytes = await out.save();
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), "split.pdf");
      setStatus({ type: "success", msg: "Done! File downloaded." });
    } catch (e) { setStatus({ type: "error", msg: e.message }); }
  };

  return (
    <>
      <UploadZone accept=".pdf" onFiles={f => setFile(f[0])} label="Upload PDF" />
      {file && <div className="file-list"><FileChip file={file} onRemove={() => setFile(null)} /></div>}
      <div className="input-group">
        <label className="input-label">Pages to extract (e.g. 1,3,5-8)</label>
        <input className="input" value={pages} onChange={e => setPages(e.target.value)} placeholder="1,3,5-8" />
      </div>
      {status && <StatusMsg {...status} />}
      <button className="btn btn-primary" disabled={!file || !pages} onClick={run}>✂️ Split PDF</button>
    </>
  );
}

// ── Reorder ──
function ReorderTool() {
  const [file, setFile] = useState(null);
  const [order, setOrder] = useState("");
  const [pageCount, setPageCount] = useState(0);
  const [status, setStatus] = useState(null);

  const loadFile = async (f) => {
    setFile(f[0]);
    const buf = await readFileAsArrayBuffer(f[0]);
    const doc = await PDFDocument.load(buf);
    const n = doc.getPageCount();
    setPageCount(n);
    setOrder(Array.from({ length: n }, (_, i) => i + 1).join(", "));
  };

  const run = async () => {
    setStatus({ type: "info", msg: "Reordering pages…" });
    try {
      const buf = await readFileAsArrayBuffer(file);
      const src = await PDFDocument.load(buf);
      const indices = order.split(",").map(s => parseInt(s.trim()) - 1);
      const out = await PDFDocument.create();
      const copied = await out.copyPages(src, indices);
      copied.forEach(p => out.addPage(p));
      const bytes = await out.save();
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), "reordered.pdf");
      setStatus({ type: "success", msg: "Done! File downloaded." });
    } catch (e) { setStatus({ type: "error", msg: e.message }); }
  };

  return (
    <>
      <UploadZone accept=".pdf" onFiles={loadFile} label="Upload PDF" />
      {file && <>
        <div className="file-list"><FileChip file={file} onRemove={() => { setFile(null); setOrder(""); }} /></div>
        <div className="input-group">
          <label className="input-label">New page order (comma-separated, {pageCount} pages total)</label>
          <input className="input" value={order} onChange={e => setOrder(e.target.value)} placeholder="e.g. 3,1,2,4" />
        </div>
      </>}
      {status && <StatusMsg {...status} />}
      <button className="btn btn-primary" disabled={!file} onClick={run}>↕️ Apply Order</button>
    </>
  );
}

// ── Rotate ──
function RotateTool() {
  const [file, setFile] = useState(null);
  const [angle, setAngle] = useState("90");
  const [mode, setMode] = useState("all");
  const [pageNum, setPageNum] = useState("1");
  const [status, setStatus] = useState(null);

  const run = async () => {
    setStatus({ type: "info", msg: "Rotating…" });
    try {
      const buf = await readFileAsArrayBuffer(file);
      const doc = await PDFDocument.load(buf);
      const pages = doc.getPages();
      const targets = mode === "all" ? pages : [pages[parseInt(pageNum) - 1]].filter(Boolean);
      targets.forEach(p => p.setRotation(degrees(parseInt(angle))));
      const bytes = await doc.save();
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), "rotated.pdf");
      setStatus({ type: "success", msg: "Done! File downloaded." });
    } catch (e) { setStatus({ type: "error", msg: e.message }); }
  };

  return (
    <>
      <UploadZone accept=".pdf" onFiles={f => setFile(f[0])} label="Upload PDF" />
      {file && <div className="file-list"><FileChip file={file} onRemove={() => setFile(null)} /></div>}
      <div className="input-group">
        <label className="input-label">Rotation angle</label>
        <select className="input" value={angle} onChange={e => setAngle(e.target.value)}>
          <option value="90">90° clockwise</option>
          <option value="180">180°</option>
          <option value="270">270° (90° counter-clockwise)</option>
        </select>
      </div>
      <div className="input-group">
        <label className="input-label">Apply to</label>
        <select className="input" value={mode} onChange={e => setMode(e.target.value)}>
          <option value="all">All pages</option>
          <option value="one">Specific page</option>
        </select>
      </div>
      {mode === "one" && <div className="input-group">
        <label className="input-label">Page number</label>
        <input className="input" type="number" min="1" value={pageNum} onChange={e => setPageNum(e.target.value)} />
      </div>}
      {status && <StatusMsg {...status} />}
      <button className="btn btn-primary" disabled={!file} onClick={run}>🔄 Rotate</button>
    </>
  );
}

// ── Watermark ──
function WatermarkTool() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("CONFIDENTIAL");
  const [opacity, setOpacity] = useState(0.3);
  const [status, setStatus] = useState(null);

  const run = async () => {
    setStatus({ type: "info", msg: "Adding watermark…" });
    try {
      const buf = await readFileAsArrayBuffer(file);
      const doc = await PDFDocument.load(buf);
      const font = await doc.embedFont(StandardFonts.HelveticaBold);
      doc.getPages().forEach(page => {
        const { width, height } = page.getSize();
        page.drawText(text, {
          x: width / 2 - (text.length * 18) / 2,
          y: height / 2,
          size: 48, font,
          color: rgb(0.7, 0.1, 0.1),
          opacity: parseFloat(opacity),
          rotate: degrees(45),
        });
      });
      const bytes = await doc.save();
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), "watermarked.pdf");
      setStatus({ type: "success", msg: "Done! File downloaded." });
    } catch (e) { setStatus({ type: "error", msg: e.message }); }
  };

  return (
    <>
      <UploadZone accept=".pdf" onFiles={f => setFile(f[0])} label="Upload PDF" />
      {file && <div className="file-list"><FileChip file={file} onRemove={() => setFile(null)} /></div>}
      <div className="input-group">
        <label className="input-label">Watermark text</label>
        <input className="input" value={text} onChange={e => setText(e.target.value)} />
      </div>
      <div className="input-group">
        <label className="input-label">Opacity: {Math.round(opacity * 100)}%</label>
        <input type="range" min="0.05" max="0.8" step="0.05" value={opacity} onChange={e => setOpacity(e.target.value)} style={{ width: "100%" }} />
      </div>
      {status && <StatusMsg {...status} />}
      <button className="btn btn-primary" disabled={!file || !text} onClick={run}>💧 Add Watermark</button>
    </>
  );
}

// ── Page Numbers ──
function PageNumsTool() {
  const [file, setFile] = useState(null);
  const [start, setStart] = useState(1);
  const [pos, setPos] = useState("bottom-center");
  const [status, setStatus] = useState(null);

  const run = async () => {
    setStatus({ type: "info", msg: "Adding page numbers…" });
    try {
      const buf = await readFileAsArrayBuffer(file);
      const doc = await PDFDocument.load(buf);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      doc.getPages().forEach((page, i) => {
        const { width, height } = page.getSize();
        const label = String(parseInt(start) + i);
        const x = pos.includes("center") ? width / 2 - 6 : pos.includes("right") ? width - 40 : 20;
        const y = pos.includes("bottom") ? 20 : height - 30;
        page.drawText(label, { x, y, size: 11, font, color: rgb(0.3, 0.3, 0.3) });
      });
      const bytes = await doc.save();
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), "numbered.pdf");
      setStatus({ type: "success", msg: "Done! File downloaded." });
    } catch (e) { setStatus({ type: "error", msg: e.message }); }
  };

  return (
    <>
      <UploadZone accept=".pdf" onFiles={f => setFile(f[0])} label="Upload PDF" />
      {file && <div className="file-list"><FileChip file={file} onRemove={() => setFile(null)} /></div>}
      <div className="input-group">
        <label className="input-label">Start from number</label>
        <input className="input" type="number" min="1" value={start} onChange={e => setStart(e.target.value)} />
      </div>
      <div className="input-group">
        <label className="input-label">Position</label>
        <select className="input" value={pos} onChange={e => setPos(e.target.value)}>
          <option value="bottom-center">Bottom center</option>
          <option value="bottom-right">Bottom right</option>
          <option value="bottom-left">Bottom left</option>
          <option value="top-center">Top center</option>
        </select>
      </div>
      {status && <StatusMsg {...status} />}
      <button className="btn btn-primary" disabled={!file} onClick={run}>🔢 Add Numbers</button>
    </>
  );
}

// ── Images to PDF ──
function Img2PdfTool() {
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState(null);

  const addFiles = (f) => setFiles(prev => [...prev, ...f.filter(x => x.type.startsWith("image/"))]);

  const run = async () => {
    setStatus({ type: "info", msg: "Creating PDF from images…" });
    try {
      const doc = await PDFDocument.create();
      for (const file of files) {
        const dataUrl = await readFileAsDataURL(file);
        const base64 = dataUrl.split(",")[1];
        let img;
        if (file.type === "image/jpeg") img = await doc.embedJpg(Uint8Array.from(atob(base64), c => c.charCodeAt(0)));
        else {
          const res = await fetch(dataUrl); const blob = await res.blob();
          const buf = await blob.arrayBuffer();
          img = await doc.embedPng(buf);
        }
        const page = doc.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      }
      const bytes = await doc.save();
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), "images.pdf");
      setStatus({ type: "success", msg: "Done! File downloaded." });
    } catch (e) { setStatus({ type: "error", msg: e.message }); }
  };

  return (
    <>
      <UploadZone accept="image/*" multiple onFiles={addFiles} label="Upload images" sub="JPG, PNG supported" />
      <div className="file-list">{files.map((f, i) => <FileChip key={i} file={f} onRemove={() => setFiles(fs => fs.filter((_, j) => j !== i))} />)}</div>
      {status && <StatusMsg {...status} />}
      <button className="btn btn-primary" disabled={files.length === 0} onClick={run}>🖼️ Convert to PDF</button>
    </>
  );
}

// ── PDF to Images ──
function Pdf2ImgTool() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState(0);

  const run = async () => {
    setStatus({ type: "info", msg: "Exporting pages as images…" });
    try {
      const pdfjsLib = window["pdfjs-dist/build/pdf"];
      if (!pdfjsLib) throw new Error("PDF.js not loaded. Please refresh.");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      const buf = await readFileAsArrayBuffer(file);
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const vp = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = vp.width; canvas.height = vp.height;
        await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
        canvas.toBlob(blob => downloadBlob(blob, `page-${i}.png`), "image/png");
        setProgress(Math.round(i / pdf.numPages * 100));
      }
      setStatus({ type: "success", msg: `${pdf.numPages} image(s) downloaded!` });
    } catch (e) { setStatus({ type: "error", msg: e.message }); }
  };

  return (
    <>
      <div className="api-notice">PDF.js is used for rendering. Each page is saved as a PNG image.</div>
      <UploadZone accept=".pdf" onFiles={f => setFile(f[0])} label="Upload PDF" />
      {file && <div className="file-list"><FileChip file={file} onRemove={() => setFile(null)} /></div>}
      {status && <><StatusMsg {...status} />{progress > 0 && <div className="progress-bar"><div className="progress-fill" style={{ width: progress + "%" }} /></div>}</>}
      <button className="btn btn-primary" disabled={!file} onClick={run}>📷 Export as Images</button>
    </>
  );
}

// ── CloudConvert tool base ──
function CloudConvertTool({ title, icon, accept, outputExt, tasksFn, inputLabel }) {
  const [file, setFile] = useState(null);
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState(0);

  const run = async () => {
    if (!apiKey) { setStatus({ type: "error", msg: "Please enter your CloudConvert API key." }); return; }
    setStatus({ type: "info", msg: "Uploading to CloudConvert…" }); setProgress(20);
    try {
      const tasks = tasksFn(file.name);
      setProgress(40);
      const blob = await cloudConvertJob(apiKey, tasks, file);
      setProgress(90);
      downloadBlob(blob, file.name.replace(/\.[^.]+$/, "") + "." + outputExt);
      setStatus({ type: "success", msg: "Conversion complete! File downloaded." }); setProgress(100);
    } catch (e) { setStatus({ type: "error", msg: e.message }); setProgress(0); }
  };

  return (
    <>
      <div className="api-notice">
        This uses <a href="https://cloudconvert.com" target="_blank">CloudConvert</a> (free tier: 25 conversions/day).{" "}
        <a href="https://cloudconvert.com/dashboard/api/v2/keys" target="_blank">Get your free API key →</a>
      </div>
      <div className="input-group">
        <label className="input-label">CloudConvert API Key</label>
        <input className="input" type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="eyJ0eXAiOiJK..." />
      </div>
      <UploadZone accept={accept} onFiles={f => setFile(f[0])} label={inputLabel || "Upload file"} />
      {file && <div className="file-list"><FileChip file={file} onRemove={() => setFile(null)} /></div>}
      {status && <><StatusMsg {...status} /><div className="progress-bar"><div className="progress-fill" style={{ width: progress + "%" }} /></div></>}
      <button className="btn btn-primary" disabled={!file} onClick={run}>{icon} Convert</button>
    </>
  );
}

function Word2PdfTool() {
  return <CloudConvertTool title="Word → PDF" icon="📝" accept=".docx,.doc" outputExt="pdf" inputLabel="Upload Word file (.docx)"
    tasksFn={(name) => ({
      upload: { operation: "import/upload", name: "upload" },
      convert: { operation: "convert", name: "convert", input: "upload", input_format: "docx", output_format: "pdf" },
      export: { operation: "export/url", name: "export", input: "convert" }
    })} />;
}

function Pdf2WordTool() {
  return <CloudConvertTool title="PDF → Word" icon="📄" accept=".pdf" outputExt="docx" inputLabel="Upload PDF"
    tasksFn={(name) => ({
      upload: { operation: "import/upload", name: "upload" },
      convert: { operation: "convert", name: "convert", input: "upload", input_format: "pdf", output_format: "docx" },
      export: { operation: "export/url", name: "export", input: "convert" }
    })} />;
}

// ── LaTeX Editor ──
function LatexTool() {
  const [latex, setLatex] = useState(`\\documentclass{article}
\\begin{document}
\\title{My Document}
\\author{Author}
\\maketitle

Hello, world! Edit this LaTeX and convert to PDF.

\\end{document}`);
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState(0);

  const run = async () => {
    if (!apiKey) { setStatus({ type: "error", msg: "Please enter your CloudConvert API key." }); return; }
    setStatus({ type: "info", msg: "Compiling LaTeX…" }); setProgress(20);
    try {
      const blob = new Blob([latex], { type: "text/plain" });
      const file = new File([blob], "document.tex");
      const tasks = {
        upload: { operation: "import/upload", name: "upload" },
        convert: { operation: "convert", name: "convert", input: "upload", input_format: "tex", output_format: "pdf" },
        export: { operation: "export/url", name: "export", input: "convert" }
      };
      setProgress(50);
      const resultBlob = await cloudConvertJob(apiKey, tasks, file);
      setProgress(90);
      downloadBlob(resultBlob, "document.pdf");
      setStatus({ type: "success", msg: "PDF compiled and downloaded!" }); setProgress(100);
    } catch (e) { setStatus({ type: "error", msg: e.message }); setProgress(0); }
  };

  return (
    <>
      <div className="api-notice">
        Edit LaTeX code below, then compile to PDF via <a href="https://cloudconvert.com" target="_blank">CloudConvert</a>.{" "}
        <a href="https://cloudconvert.com/dashboard/api/v2/keys" target="_blank">Get free API key →</a>
      </div>
      <div className="input-group">
        <label className="input-label">CloudConvert API Key</label>
        <input className="input" type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="eyJ0eXAiOiJK..." />
      </div>
      <div className="input-group">
        <label className="input-label">LaTeX Source</label>
        <textarea className="input" value={latex} onChange={e => setLatex(e.target.value)} rows={12} />
      </div>
      {status && <><StatusMsg {...status} /><div className="progress-bar"><div className="progress-fill" style={{ width: progress + "%" }} /></div></>}
      <button className="btn btn-primary" onClick={run}>🧮 Compile to PDF</button>
    </>
  );
}

function Pdf2LatexTool() {
  const [file, setFile] = useState(null);
  const [latex, setLatex] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState(null);

  const extract = async () => {
    if (!apiKey) { setStatus({ type: "error", msg: "CloudConvert API key required." }); return; }
    setStatus({ type: "info", msg: "Extracting text from PDF…" });
    try {
      const buf = await readFileAsArrayBuffer(file);
      // Extract text using pdf-lib (basic), then wrap in LaTeX template
      const doc = await PDFDocument.load(buf);
      const pages = doc.getPages();
      let latexOut = `\\documentclass{article}\n\\usepackage[utf8]{inputenc}\n\\begin{document}\n\n`;
      // Note: pdf-lib doesn't extract text; we generate structure
      latexOut += `% PDF has ${pages.length} page(s).\n% Text extraction requires CloudConvert or OCR.\n`;
      latexOut += `% Below is a template — CloudConvert tex extraction coming:\n\n`;
      latexOut += `\\section{Page 1}\nExtracted text will appear here.\n\n\\end{document}`;
      setLatex(latexOut);
      setStatus({ type: "success", msg: "Template generated. Edit below and compile." });
    } catch (e) { setStatus({ type: "error", msg: e.message }); }
  };

  const compile = async () => {
    if (!apiKey) { setStatus({ type: "error", msg: "CloudConvert API key required." }); return; }
    setStatus({ type: "info", msg: "Compiling edited LaTeX…" });
    try {
      const blob = new Blob([latex], { type: "text/plain" });
      const f = new File([blob], "document.tex");
      const tasks = {
        upload: { operation: "import/upload", name: "upload" },
        convert: { operation: "convert", name: "convert", input: "upload", input_format: "tex", output_format: "pdf" },
        export: { operation: "export/url", name: "export", input: "convert" }
      };
      const result = await cloudConvertJob(apiKey, tasks, f);
      downloadBlob(result, "edited.pdf");
      setStatus({ type: "success", msg: "Compiled PDF downloaded!" });
    } catch (e) { setStatus({ type: "error", msg: e.message }); }
  };

  return (
    <>
      <div className="api-notice">
        <a href="https://cloudconvert.com/dashboard/api/v2/keys" target="_blank">Get free CloudConvert API key →</a>
      </div>
      <div className="input-group">
        <label className="input-label">CloudConvert API Key</label>
        <input className="input" type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="eyJ0eXAiOiJK..." />
      </div>
      <UploadZone accept=".pdf" onFiles={f => { setFile(f[0]); setLatex(""); }} label="Upload PDF" />
      {file && <div className="file-list"><FileChip file={file} onRemove={() => setFile(null)} /></div>}
      {status && <StatusMsg {...status} />}
      <button className="btn btn-primary" disabled={!file} onClick={extract}>🔬 Extract LaTeX</button>
      {latex && <>
        <div className="input-group" style={{ marginTop: 14 }}>
          <label className="input-label">Edit LaTeX</label>
          <textarea className="input" value={latex} onChange={e => setLatex(e.target.value)} rows={10} />
        </div>
        <button className="btn btn-primary" onClick={compile}>🧮 Recompile to PDF</button>
      </>}
    </>
  );
}

// ── Edit Text — Visual Canvas Editor ──
function EditTextTool() {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [canvasReady, setCanvasReady] = useState(false);
  const [annotations, setAnnotations] = useState([]); // {id, page, x, y, text, size, color, selected}
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState(null);
  const [dragging, setDragging] = useState(null);
  const canvasRef = useRef();
  const overlayRef = useRef();
  const pdfRef = useRef(null);
  const renderingRef = useRef(false);
  const idCounter = useRef(1);

  const loadPdf = async (files) => {
    const f = files[0];
    setFile(f);
    setAnnotations([]);
    setSelectedId(null);
    setEditingId(null);
    setCanvasReady(false);
    const pdfjsLib = window["pdfjs-dist/build/pdf"];
    if (!pdfjsLib) { setStatus({ type: "error", msg: "PDF.js not loaded. Refresh page." }); return; }
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const buf = await readFileAsArrayBuffer(f);
    pdfRef.current = await pdfjsLib.getDocument({ data: buf }).promise;
    setPageCount(pdfRef.current.numPages);
    setCurrentPage(1);
    setCanvasReady(true);
  };

  const renderPage = useCallback(async (pageNum) => {
    if (!pdfRef.current || !canvasRef.current || renderingRef.current) return;
    renderingRef.current = true;
    try {
      const page = await pdfRef.current.getPage(pageNum);
      const container = canvasRef.current.parentElement;
      const scale = (container.clientWidth - 0) / page.getViewport({ scale: 1 }).width;
      const vp = page.getViewport({ scale });
      canvasRef.current.width = vp.width;
      canvasRef.current.height = vp.height;
      if (overlayRef.current) {
        overlayRef.current.style.width = vp.width + "px";
        overlayRef.current.style.height = vp.height + "px";
      }
      await page.render({ canvasContext: canvasRef.current.getContext("2d"), viewport: vp }).promise;
    } finally { renderingRef.current = false; }
  }, []);

  useEffect(() => { if (canvasReady) renderPage(currentPage); }, [canvasReady]);

  // Re-render when page changes
  const goPage = (n) => { setCurrentPage(n); setSelectedId(null); setEditingId(null); setTimeout(() => renderPage(n), 50); };

  const handleCanvasClick = (e) => {
    if (editingId) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Check if clicked on existing annotation
    const hit = annotations.filter(a => a.page === currentPage).find(a =>
      x >= a.x && x <= a.x + a.text.length * a.size * 0.6 && y >= a.y - a.size && y <= a.y + 4
    );
    if (hit) { setSelectedId(hit.id); return; }
    // Add new annotation
    const id = idCounter.current++;
    setAnnotations(prev => [...prev, { id, page: currentPage, x, y, text: "Text here", size: 16, color: "#000000", bold: false }]);
    setSelectedId(id);
    setEditingId(id);
  };

  const updateAnnotation = (id, key, val) => setAnnotations(prev => prev.map(a => a.id === id ? { ...a, [key]: val } : a));
  const deleteSelected = () => { setAnnotations(prev => prev.filter(a => a.id !== selectedId)); setSelectedId(null); setEditingId(null); };

  const startDrag = (e, id) => {
    e.stopPropagation();
    const rect = canvasRef.current.getBoundingClientRect();
    const ann = annotations.find(a => a.id === id);
    setDragging({ id, startX: e.clientX - rect.left - ann.x, startY: e.clientY - rect.top - ann.y });
    setSelectedId(id);
  };
  const onDragMove = (e) => {
    if (!dragging) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - dragging.startX;
    const y = e.clientY - rect.top - dragging.startY;
    updateAnnotation(dragging.id, "x", Math.max(0, x));
    updateAnnotation(dragging.id, "y", Math.max(20, y));
  };

  const applyAndDownload = async () => {
    setStatus({ type: "info", msg: "Applying text edits…" });
    try {
      const buf = await readFileAsArrayBuffer(file);
      const doc = await PDFDocument.load(buf);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
      const pages = doc.getPages();
      // Get scale factor for coordinate mapping
      const pdfjsLib = window["pdfjs-dist/build/pdf"];
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      const pdfDoc2 = await pdfjsLib.getDocument({ data: buf }).promise;

      for (const ann of annotations) {
        const pageIndex = ann.page - 1;
        const page = pages[pageIndex];
        if (!page) continue;
        const pdfPage = await pdfDoc2.getPage(ann.page);
        const { width, height } = page.getSize();
        const vp = pdfPage.getViewport({ scale: 1 });
        // Map canvas coords to PDF coords
        const scaleX = width / canvasRef.current.width;
        const scaleY = height / canvasRef.current.height;
        const pdfX = ann.x * scaleX;
        const pdfY = height - ann.y * scaleY;
        const hex = ann.color.replace("#", "");
        const r = parseInt(hex.substr(0,2),16)/255;
        const g = parseInt(hex.substr(2,2),16)/255;
        const b = parseInt(hex.substr(4,2),16)/255;
        page.drawText(ann.text, {
          x: pdfX, y: pdfY,
          size: ann.size,
          font: ann.bold ? boldFont : font,
          color: rgb(r, g, b),
        });
      }
      const bytes = await doc.save();
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), "edited.pdf");
      setStatus({ type: "success", msg: "Done! Edited PDF downloaded." });
    } catch (e) { setStatus({ type: "error", msg: e.message }); }
  };

  const selected = annotations.find(a => a.id === selectedId);
  const pageAnnotations = annotations.filter(a => a.page === currentPage);

  if (!file) return (
    <UploadZone accept=".pdf" onFiles={loadPdf} label="Upload PDF to edit" sub="Tap to choose a PDF" />
  );

  return (
    <>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn btn-secondary" style={{ width: "auto", padding: "6px 12px", fontSize: 12 }}
          onClick={() => { setFile(null); setCanvasReady(false); setAnnotations([]); }}>← Back</button>
        <span style={{ fontSize: 12, color: COLORS.textMuted, flex: 1 }}>Tap canvas to add text</span>
        {pageCount > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button className="btn btn-secondary" style={{ width: 28, height: 28, padding: 0, fontSize: 14 }} onClick={() => currentPage > 1 && goPage(currentPage - 1)}>‹</button>
            <span style={{ fontSize: 12, color: COLORS.textMuted }}>{currentPage}/{pageCount}</span>
            <button className="btn btn-secondary" style={{ width: 28, height: 28, padding: 0, fontSize: 14 }} onClick={() => currentPage < pageCount && goPage(currentPage + 1)}>›</button>
          </div>
        )}
      </div>

      {/* Canvas area */}
      <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: `1px solid ${COLORS.border}`, marginBottom: 12, cursor: "crosshair" }}
        onMouseMove={onDragMove} onMouseUp={() => setDragging(null)} onTouchEnd={() => setDragging(null)}>
        <canvas ref={el => { canvasRef.current = el; if (el && canvasReady) setTimeout(() => renderPage(currentPage), 100); }} style={{ display: "block", width: "100%" }} />
        {/* Overlay for annotations */}
        <div ref={overlayRef} style={{ position: "absolute", inset: 0 }} onClick={handleCanvasClick}>
          {pageAnnotations.map(ann => (
            <div key={ann.id}
              style={{
                position: "absolute", left: ann.x, top: ann.y - ann.size,
                cursor: "move", userSelect: "none",
                outline: selectedId === ann.id ? `2px solid ${COLORS.accent}` : "none",
                borderRadius: 3, padding: "1px 3px",
                background: selectedId === ann.id ? `${COLORS.accent}18` : "transparent",
              }}
              onMouseDown={e => startDrag(e, ann.id)}
              onTouchStart={e => { const t = e.touches[0]; startDrag({ stopPropagation: () => {}, clientX: t.clientX, clientY: t.clientY }, ann.id); }}
              onTouchMove={e => { const t = e.touches[0]; onDragMove({ clientX: t.clientX, clientY: t.clientY }); }}
            >
              {editingId === ann.id ? (
                <input autoFocus style={{
                  background: "transparent", border: "none", outline: "none",
                  color: ann.color, fontSize: ann.size, fontWeight: ann.bold ? 700 : 400,
                  fontFamily: "Helvetica, Arial, sans-serif", minWidth: 60,
                }}
                  value={ann.text}
                  onChange={e => updateAnnotation(ann.id, "text", e.target.value)}
                  onBlur={() => setEditingId(null)}
                  onKeyDown={e => e.key === "Enter" && setEditingId(null)}
                />
              ) : (
                <span style={{ color: ann.color, fontSize: ann.size, fontWeight: ann.bold ? 700 : 400, fontFamily: "Helvetica, Arial, sans-serif", whiteSpace: "nowrap" }}
                  onDoubleClick={() => setEditingId(ann.id)}>
                  {ann.text}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Selected annotation controls */}
      {selected && (
        <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.accent}40`, borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.accent }}>Selected text</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ fontSize: 12, padding: "3px 8px", borderRadius: 6, background: COLORS.accentYellow + "20", border: `1px solid ${COLORS.accentYellow}40`, color: COLORS.accentYellow, cursor: "pointer" }}
                onClick={() => setEditingId(selected.id)}>Edit</button>
              <button style={{ fontSize: 12, padding: "3px 8px", borderRadius: 6, background: COLORS.accentRed + "20", border: `1px solid ${COLORS.accentRed}40`, color: COLORS.accentRed, cursor: "pointer" }}
                onClick={deleteSelected}>Delete</button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <div><label className="input-label">Size</label>
              <input className="input" type="number" min="8" max="72" value={selected.size} onChange={e => updateAnnotation(selected.id, "size", parseInt(e.target.value))} /></div>
            <div><label className="input-label">Color</label>
              <input type="color" value={selected.color} onChange={e => updateAnnotation(selected.id, "color", e.target.value)}
                style={{ width: "100%", height: 38, borderRadius: 8, border: `1px solid ${COLORS.border}`, cursor: "pointer", background: COLORS.bg }} /></div>
            <div><label className="input-label">Bold</label>
              <button onClick={() => updateAnnotation(selected.id, "bold", !selected.bold)}
                style={{ width: "100%", height: 38, borderRadius: 8, border: `1px solid ${selected.bold ? COLORS.accent : COLORS.border}`, background: selected.bold ? COLORS.accent + "20" : COLORS.bg, color: selected.bold ? COLORS.accent : COLORS.textMuted, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>B</button>
            </div>
          </div>
        </div>
      )}

      {!selected && canvasReady && (
        <div className="api-notice" style={{ marginBottom: 12 }}>
          👆 Tap anywhere on the PDF to add text. Drag to move. Double-tap to edit. Select to change size, color, bold.
        </div>
      )}

      {status && <StatusMsg {...status} />}
      <button className="btn btn-primary" onClick={applyAndDownload} disabled={annotations.length === 0}>✏️ Save Edited PDF</button>
    </>
  );
}

// ── PPT → PDF ──
function Ppt2PdfTool() {
  return <CloudConvertTool title="PPT → PDF" icon="📊" accept=".ppt,.pptx" outputExt="pdf" inputLabel="Upload PowerPoint file (.pptx)"
    tasksFn={(name) => ({
      upload: { operation: "import/upload", name: "upload" },
      convert: { operation: "convert", name: "convert", input: "upload", input_format: "pptx", output_format: "pdf" },
      export: { operation: "export/url", name: "export", input: "convert" }
    })} />;
}

// ── PDF → PPT ──
function Pdf2PptTool() {
  return <CloudConvertTool title="PDF → PPT" icon="🎞️" accept=".pdf" outputExt="pptx" inputLabel="Upload PDF"
    tasksFn={(name) => ({
      upload: { operation: "import/upload", name: "upload" },
      convert: { operation: "convert", name: "convert", input: "upload", input_format: "pdf", output_format: "pptx" },
      export: { operation: "export/url", name: "export", input: "convert" }
    })} />;
}

// ── Compress ──
function CompressTool() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(null);

  const run = async () => {
    setStatus({ type: "info", msg: "Compressing PDF…" });
    try {
      const buf = await readFileAsArrayBuffer(file);
      const doc = await PDFDocument.load(buf, { updateMetadata: false });
      const bytes = await doc.save({ useObjectStreams: true });
      const blob = new Blob([bytes], { type: "application/pdf" });
      const saved = ((file.size - blob.size) / file.size * 100).toFixed(1);
      downloadBlob(blob, "compressed.pdf");
      setStatus({ type: "success", msg: `Done! Reduced by ~${saved}%. Downloaded.` });
    } catch (e) { setStatus({ type: "error", msg: e.message }); }
  };

  return (
    <>
      <div className="api-notice">Basic compression via object streams. For heavy compression, use CloudConvert tools.</div>
      <UploadZone accept=".pdf" onFiles={f => setFile(f[0])} label="Upload PDF" />
      {file && <div className="file-list"><FileChip file={file} onRemove={() => setFile(null)} /></div>}
      {status && <StatusMsg {...status} />}
      <button className="btn btn-primary" disabled={!file} onClick={run}>🗜️ Compress PDF</button>
    </>
  );
}

// ── Protect ──
function ProtectTool() {
  const [file, setFile] = useState(null);
  const [pass, setPass] = useState("");
  const [status, setStatus] = useState(null);

  const run = async () => {
    setStatus({ type: "info", msg: "Note: pdf-lib password encryption has browser limitations. For full encryption, use CloudConvert." });
    try {
      const buf = await readFileAsArrayBuffer(file);
      const doc = await PDFDocument.load(buf);
      // pdf-lib doesn't support password encryption natively; inform user
      setStatus({ type: "error", msg: "Password protection requires a server. Use CloudConvert's 'protect' operation with your API key, or try SmallPDF.com for free." });
    } catch (e) { setStatus({ type: "error", msg: e.message }); }
  };

  return (
    <>
      <div className="api-notice">Password encryption requires server-side processing due to browser security limits.</div>
      <UploadZone accept=".pdf" onFiles={f => setFile(f[0])} label="Upload PDF" />
      {file && <div className="file-list"><FileChip file={file} onRemove={() => setFile(null)} /></div>}
      <div className="input-group">
        <label className="input-label">Password</label>
        <input className="input" type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="Enter password" />
      </div>
      {status && <StatusMsg {...status} />}
      <button className="btn btn-primary" disabled={!file || !pass} onClick={run}>🔒 Protect PDF</button>
    </>
  );
}

function UnlockTool() {
  return (
    <div className="api-notice" style={{ fontSize: 13, lineHeight: 1.6 }}>
      🔓 <strong>Unlock PDF</strong><br /><br />
      Removing passwords requires the original password and server-side processing.<br /><br />
      <strong>Free options:</strong><br />
      • <a href="https://www.ilovepdf.com/unlock_pdf" target="_blank" style={{ color: COLORS.accent }}>ilovepdf.com/unlock_pdf</a><br />
      • <a href="https://smallpdf.com/unlock-pdf" target="_blank" style={{ color: COLORS.accent }}>smallpdf.com/unlock-pdf</a><br /><br />
      In the Play Store version, this will be handled via CloudConvert API.
    </div>
  );
}

// ─── Tool registry ────────────────────────────────────────────────────────────
const TOOL_COMPONENTS = {
  merge: MergeTool, split: SplitTool, reorder: ReorderTool,
  rotate: RotateTool, compress: CompressTool, watermark: WatermarkTool,
  pagenums: PageNumsTool, img2pdf: Img2PdfTool, pdf2img: Pdf2ImgTool,
  word2pdf: Word2PdfTool, pdf2word: Pdf2WordTool,
  latex2pdf: LatexTool, pdf2latex: Pdf2LatexTool,
  edittext: EditTextTool, protect: ProtectTool, unlock: UnlockTool,
  ppt2pdf: Ppt2PdfTool, pdf2ppt: Pdf2PptTool,
};

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState("All");
  const [activeTool, setActiveTool] = useState(null);

  const filtered = activeTab === "All" ? TOOLS : TOOLS.filter(t => t.cat === activeTab);
  const ToolComp = activeTool ? TOOL_COMPONENTS[activeTool.id] : null;

  return (
    <>
      <style>{css}</style>
      {/* Load pdfjs */}
      <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" />

      <div className="app">
        <div className="header">
          <div className="header-row">
            <div className="logo">📋</div>
            <div>
              <h1>PDF Toolkit</h1>
              <p>All-in-one PDF tools</p>
            </div>
          </div>
        </div>

        <div className="tabs">
          {CATEGORIES.map(c => (
            <button key={c} className={`tab${activeTab === c ? " active" : ""}`} onClick={() => setActiveTab(c)}>{c}</button>
          ))}
        </div>

        <div className="tools" style={{ marginTop: 12 }}>
          {filtered.map(tool => (
            <button key={tool.id} className="tool-card" style={{ "--accent-color": tool.accent }} onClick={() => setActiveTool(tool)}>
              <div className="tool-icon">{tool.icon}</div>
              <div className="tool-info">
                <div className="tool-name">{tool.name}</div>
                <div className="tool-desc">{tool.desc}</div>
              </div>
              <span className="tool-arrow">›</span>
            </button>
          ))}
        </div>
      </div>

      {activeTool && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setActiveTool(null)}>
          <div className="modal">
            <div className="modal-handle" />
            <div className="modal-header">
              <span className="modal-title">{activeTool.icon} {activeTool.name}</span>
              <button className="modal-close" onClick={() => setActiveTool(null)}>✕</button>
            </div>
            <div className="modal-body">
              {ToolComp && <ToolComp />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
