import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Mic, Send, Search, MoreVertical, 
  Activity, Stethoscope, User, Play, 
  FileText, CheckCheck, StopCircle, Download, Globe, ChevronDown, X
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// --- SUB-COMPONENTS ---

const HighlightText = ({ text, highlight }) => {
  if (!highlight || !text) return <span>{text}</span>;
  const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() ? 
        <span key={i} className="bg-yellow-500/30 text-yellow-900 dark:text-yellow-200 px-0.5 rounded border border-yellow-500/50 font-medium">{part}</span> : part
      )}
    </span>
  );
};

const AudioPlayer = ({ src, isDoctor }) => (
  <div className={`mt-3 mb-1 flex items-center gap-3 p-2 rounded-xl border transition-all w-full max-w-[240px] ${isDoctor ? 'bg-white/10 border-white/10 hover:bg-white/20' : 'bg-black/5 border-black/5 dark:bg-black/20 dark:border-white/5 hover:bg-black/10 dark:hover:bg-black/30'}`}>
    <div className={`p-2 rounded-full shadow-sm shrink-0 ${isDoctor ? 'bg-white/20 text-white' : 'bg-white dark:bg-white/10 text-gray-700 dark:text-white'}`}>
      <Play size={12} fill="currentColor"/>
    </div>
    <audio controls src={src} className="h-8 w-full min-w-[140px] opacity-90" style={{ filter: isDoctor ? 'invert(1)' : 'none' }} />
  </div>
);

export default function App() {
  // --- STATE ---
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [role, setRole] = useState("doctor");
  const [patientLang, setPatientLang] = useState("Hindi");
  
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  
  // Mobile specific states
  const [showReportModal, setShowReportModal] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const messagesEndRef = useRef(null);
  
  // Available Languages
  const languages = [
    "Hindi", "Spanish", "French", "German", 
    "Chinese", "Japanese", "Arabic", "Portuguese", "Russian"
  ];

  // --- LOGIC ---
  useEffect(() => { 
    // Automatically wipe history on page load (Refresh)
    const initSession = async () => {
      try {
        await axios.delete(`${API_URL}/clear`);
        setMessages([]); // Clear local state
      } catch (err) {
        console.error("Failed to clear history:", err);
      }
    };
    initSession();
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_URL}/history`);
      setMessages(res.data);
    } catch (err) { console.error(err); }
  };

  const handleSendText = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    const target = role === "doctor" ? patientLang : "English";

    try {
      await axios.post(`${API_URL}/chat/text`, { role, text: inputText, target_lang: target });
      setInputText("");
      fetchHistory();
    } catch (err) { alert("Failed to send"); } 
    finally { setIsProcessing(false); }
  };

  // --- AUDIO RECORDING HANDLERS ---
  const startRecording = async (e) => {
    if(e && e.cancelable) e.preventDefault();
    if(e && e.stopPropagation) e.stopPropagation();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = handleAudioStop;
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) { 
      alert("Microphone access denied."); 
    }
  };

  const stopRecording = (e) => {
    if(e && e.cancelable) e.preventDefault();
    if(e && e.stopPropagation) e.stopPropagation();

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioStop = async () => {
    setIsProcessing(true);
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");
    formData.append("role", role);
    formData.append("target_lang", role === "doctor" ? patientLang : "English");

    try {
      await axios.post(`${API_URL}/chat/audio`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      fetchHistory();
    } catch (err) { alert("Audio upload failed"); } 
    finally { setIsProcessing(false); }
  };

  const handleGenerateSummary = async () => {
    setSummary("Analysing conversation data...");
    try {
      const res = await axios.get(`${API_URL}/summarize`);
      setSummary(res.data.summary);
    } catch (err) { setSummary("Summary failed."); }
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  return (
    <div className="dark">
      <div className="flex h-screen w-full overflow-hidden bg-[#fcfcfc] dark:bg-[#0d1117] text-gray-800 dark:text-gray-200 font-sans selection:bg-blue-200 dark:selection:bg-blue-900">
        
        {/* --- MAIN CHAT AREA --- */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] dark:bg-[#0d1117] relative">
          
          {/* Header */}
          <header className="bg-white/90 dark:bg-[#161b22]/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 p-3 sm:p-4 z-20 sticky top-0 flex items-center justify-between gap-2 sm:gap-4 transition-all duration-300">
            
            {/* Branding */}
            <div className="flex items-center gap-3 shrink-0">
               <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20 shrink-0">
                 N
               </div>
               <div className="hidden sm:block">
                  <h1 className="font-bold text-lg tracking-tight text-gray-900 dark:text-white leading-none">NaoTranslate</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${isProcessing ? 'bg-yellow-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                    <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Live</span>
                  </div>
               </div>
            </div>

            {/* Center Controls */}
            <div className="flex items-center gap-2 sm:gap-3 bg-gray-100 dark:bg-[#0d1117] p-1 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden max-w-full">
              {/* Role Switcher */}
              <div className="flex bg-white dark:bg-[#21262d] rounded-lg p-0.5 sm:p-1 shadow-sm shrink-0">
                <button onClick={() => setRole('doctor')} className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wide transition-all ${role === 'doctor' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                  <Stethoscope size={14} className="shrink-0" /> <span className="hidden xs:inline">Dr</span>
                </button>
                <button onClick={() => setRole('patient')} className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wide transition-all ${role === 'patient' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                  <User size={14} className="shrink-0" /> <span className="hidden xs:inline">Pt</span>
                </button>
              </div>

              <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-0.5 shrink-0"></div>

              {/* Language Dropdown */}
              <div className="relative flex items-center group">
                <Globe size={14} className="text-gray-400 absolute left-2 pointer-events-none" />
                <select 
                  value={patientLang}
                  onChange={(e) => setPatientLang(e.target.value)}
                  className="pl-7 pr-7 py-1.5 bg-white dark:bg-[#21262d] border border-transparent dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 rounded-lg text-xs font-bold uppercase text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 cursor-pointer outline-none appearance-none transition-all shadow-sm w-24 sm:w-32"
                >
                  {languages.map(lang => <option key={lang} value={lang} className="bg-white dark:bg-[#21262d] text-gray-900 dark:text-white">{lang}</option>)}
                </select>
                <ChevronDown size={10} className="text-gray-400 absolute right-2 pointer-events-none" />
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <div className={`relative transition-all duration-300 ${showSearch ? 'w-24 sm:w-48 opacity-100 scale-100' : 'w-0 opacity-0 scale-95'} overflow-hidden`}>
                 <input className="w-full bg-gray-100 dark:bg-[#0d1117] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm rounded-full pl-3 p-2" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/>
              </div>
              <button onClick={() => setShowSearch(!showSearch)} className={`p-2.5 rounded-full transition-all duration-200 ${showSearch ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400'}`}><Search size={18} /></button>
              
              {/* Mobile Report Button */}
              <button onClick={() => setShowReportModal(true)} className="lg:hidden p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-all"><FileText size={18} /></button>
            </div>
          </header>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            <div className="flex justify-center mb-6">
               <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-gray-200 dark:bg-[#161b22] px-4 py-1.5 rounded-full border border-gray-300 dark:border-gray-800 shadow-sm">
                   Session Started
               </span>
            </div>

            {messages.filter(m => 
                m.original_text.toLowerCase().includes(searchQuery.toLowerCase()) || 
                m.translated_text.toLowerCase().includes(searchQuery.toLowerCase())
            ).map((msg) => {
                const isDoctor = msg.role === 'doctor';
                return (
                    <div key={msg.id} className={`flex flex-col gap-1 max-w-[90%] sm:max-w-xl group ${isDoctor ? 'items-end ml-auto' : 'items-start mr-auto'} animate-in fade-in slide-in-from-bottom-2`}>
                        <div className={`flex items-center gap-2 mb-1 ${isDoctor ? 'pr-1' : 'pl-1'}`}>
                            {isDoctor ? (
                                <>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Dr. Smith</span>
                                    <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800"><Stethoscope size={10} /></div>
                                </>
                            ) : (
                                <>
                                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800"><User size={10} /></div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Patient</span>
                                </>
                            )}
                        </div>
                        
                        <div className={`p-4 sm:p-5 rounded-2xl shadow-md border relative transition-all hover:shadow-lg ${
                            isDoctor 
                            ? 'bg-white dark:bg-[#374151] border-gray-200 dark:border-gray-600 rounded-tr-none text-gray-800 dark:text-white' 
                            : 'bg-[#242c36] text-white border-transparent rounded-tl-none'
                        }`}>
                            <p className="text-[15px] font-medium leading-relaxed">
                                <HighlightText text={msg.translated_text} highlight={searchQuery} />
                            </p>
                            
                            {msg.original_audio_url && <AudioPlayer src={`${API_URL}${msg.original_audio_url}`} isDoctor={isDoctor} />}

                            <div className={`mt-3 pt-3 border-t flex flex-col gap-1 ${isDoctor ? 'border-gray-100 dark:border-gray-600' : 'border-gray-600'}`}>
                                <p className="text-[10px] uppercase opacity-50 font-bold tracking-wide">Original ({msg.original_lang}):</p>
                                <p className="text-sm opacity-80 italic font-light">
                                    <HighlightText text={msg.original_text} highlight={searchQuery} />
                                </p>
                            </div>
                        </div>
                    </div>
                );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input */}
          <footer className="bg-white/95 dark:bg-[#1f2937]/95 backdrop-blur border-t border-gray-200 dark:border-gray-800 p-3 sm:p-4 z-30">
            <div className="max-w-4xl mx-auto w-full flex items-center gap-3">
               
               <button 
                 onMouseDown={startRecording}
                 onMouseUp={stopRecording}
                 onTouchStart={startRecording}
                 onTouchEnd={stopRecording}
                 onContextMenu={(e) => e.preventDefault()}
                 className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md select-none touch-manipulation ${
                    isRecording 
                    ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-500/20 scale-110' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95'
                 }`}
               >
                 {isRecording ? <StopCircle size={22} /> : <Mic size={22} />}
               </button>

               <div className="flex-1 bg-gray-50 dark:bg-[#2d3642] rounded-full border border-gray-200 dark:border-gray-600 flex items-center px-4 py-2.5 transition-all focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-[#161b22]">
                 <input 
                   type="text" 
                   className="w-full bg-transparent border-none focus:ring-0 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 text-sm"
                   placeholder={isRecording ? "Listening..." : `Type message as ${role}...`}
                   value={inputText}
                   onChange={(e) => setInputText(e.target.value)}
                   onKeyPress={(e) => e.key === 'Enter' && handleSendText()}
                   disabled={isProcessing}
                 />
               </div>

               <button 
                 onClick={handleSendText}
                 disabled={!inputText.trim() || isProcessing}
                 className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 transition-all transform active:scale-95 disabled:opacity-50 disabled:grayscale disabled:shadow-none"
               >
                 <Send size={20} className={isProcessing ? 'animate-spin' : 'ml-0.5'} />
               </button>
            </div>
            <p className="text-center text-[10px] text-gray-400 mt-2 hidden sm:block">
                AI can make mistakes. Please verify important medical information.
            </p>
          </footer>
        </main>

        {/* --- RIGHT SIDEBAR (Desktop) --- */}
        <aside className="hidden lg:flex flex-col w-80 bg-white dark:bg-[#161b22] border-l border-gray-200 dark:border-gray-800 z-20 shrink-0 shadow-xl">
           <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <Activity size={18} className="text-blue-500" />
                 <h3 className="font-bold text-sm tracking-wide text-gray-900 dark:text-white">Live Summary</h3>
              </div>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
           </div>

           <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <SummaryContent summary={summary} handleDownloadPDF={handleDownloadPDF} />
           </div>

           <div className="p-5 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#11161d]">
              <button 
                onClick={handleGenerateSummary}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transform active:scale-95"
              >
                 <Activity size={18} /> Update Report
              </button>
           </div>
        </aside>

        {/* --- MOBILE REPORT MODAL --- */}
        {showReportModal && (
          <div className="lg:hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white dark:bg-[#161b22] w-full sm:w-[400px] h-[85vh] sm:h-auto rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10">
                
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-[#161b22]">
                   <div className="flex items-center gap-2">
                     <FileText className="text-blue-500" size={20}/>
                     <h3 className="font-bold text-lg dark:text-white">Clinical Report</h3>
                   </div>
                   <button onClick={() => setShowReportModal(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                     <X size={18}/>
                   </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 bg-[#f8fafc] dark:bg-[#0d1117]">
                   <SummaryContent summary={summary} handleDownloadPDF={handleDownloadPDF} />
                </div>

                <div className="p-5 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#161b22]">
                  <button 
                    onClick={handleGenerateSummary}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-transform"
                  >
                     <Activity size={18} /> Generate New Report
                  </button>
                </div>
             </div>
          </div>
        )}

      </div>
    </div>
  );
}

// Extracted Component for re-use
const SummaryContent = ({ summary, handleDownloadPDF }) => (
  <>
    <div>
      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Key Medical Insights</h4>
      
      {summary ? (
        <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white dark:bg-[#1c2229] border border-gray-200 dark:border-gray-700/50 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-bold text-blue-500 uppercase tracking-wide">AI Analysis</span>
                    <span className="text-[9px] font-bold bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-500/20">CONFIDENTIAL</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-light whitespace-pre-wrap">
                    {summary}
                </p>
            </div>
            
            <button 
                onClick={handleDownloadPDF}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-white rounded-lg text-xs font-bold transition-all border border-gray-200 dark:border-gray-700"
            >
                <Download size={14} /> Save Report as PDF
            </button>
        </div>
      ) : (
        <div className="p-8 text-center border border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-[#0d1117]/50">
            <FileText size={24} className="mx-auto text-gray-300 dark:text-gray-600 mb-2"/>
            <p className="text-xs text-gray-400">Tap generate to analyze the conversation.</p>
        </div>
      )}
    </div>

    <div className="mt-6">
      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Detected Entities</h4>
      <div className="flex flex-wrap gap-2">
        <span className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-300 font-medium cursor-default">#PatientID-92</span>
        <span className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-300 font-medium cursor-default">#Cardiology</span>
        <span className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-300 font-medium cursor-default">#Bilingual</span>
      </div>
    </div>
  </>
);
