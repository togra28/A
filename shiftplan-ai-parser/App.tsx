
import React, { useState } from 'react';
import { 
  FileText, 
  Upload, 
  Play, 
  CheckCircle, 
  AlertCircle, 
  Copy, 
  Trash2, 
  Info,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  File as FileIcon
} from 'lucide-react';
import { extractShiftData } from './services/geminiService';
import { ProcessingResult, ProcessingError, InputItem } from './types';

const App: React.FC = () => {
  const [inputs, setInputs] = useState<InputItem[]>([]);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [errors, setErrors] = useState<ProcessingError[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'input' | 'results'>('input');

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newInputs: InputItem[] = [];
    for (const file of Array.from(files)) {
      const id = Math.random().toString(36).substr(2, 9);
      if (file.type === 'text/plain') {
        const content = await file.text();
        newInputs.push({ id, name: file.name, mimeType: file.type, content });
      } else {
        const base64 = await fileToBase64(file);
        newInputs.push({ id, name: file.name, mimeType: file.type, base64 });
      }
    }
    setInputs(prev => [...prev, ...newInputs]);
  };

  const addManualInput = () => {
    setInputs(prev => [...prev, { 
      id: Math.random().toString(36).substr(2, 9), 
      name: 'Manual Entry', 
      mimeType: 'text/plain', 
      content: '' 
    }]);
  };

  const updateTextContent = (id: string, content: string) => {
    setInputs(prev => prev.map(input => input.id === id ? { ...input, content } : input));
  };

  const removeInput = (id: string) => {
    setInputs(prev => prev.filter(input => input.id !== id));
  };

  const extractEmployeeId = (input: InputItem): string | null => {
    const combinedText = (input.name + " " + (input.content || "")).toUpperCase();
    const match = combinedText.match(/MA_(\d+)/);
    return match ? `MA_${match[1]}` : null;
  };

  const processInputs = async () => {
    setIsProcessing(true);
    setResults([]);
    setErrors([]);
    setActiveTab('results');

    const newResults: ProcessingResult[] = [];
    const newErrors: ProcessingError[] = [];

    for (const input of inputs) {
      const employeeIdHint = extractEmployeeId(input) || "unbekannt";
      
      try {
        const preferences = await extractShiftData(input, employeeIdHint);
        
        // Use the ID from the model if it found one, otherwise our hint
        const actualId = preferences.length > 0 ? preferences[0].employeeId : employeeIdHint;

        const formattedOutput = preferences
          .filter(p => p.days.length > 0)
          .map(p => `${p.type}_${p.employeeId}: ${p.days.sort((a, b) => a - b).join(',')}`);

        newResults.push({
          fileName: input.name,
          employeeId: actualId,
          preferences,
          rawText: input.content,
          formattedOutput
        });
      } catch (err: any) {
        newErrors.push({ 
          fileName: input.name, 
          message: err.message || 'Failed to process file.' 
        });
      }
    }

    setResults(newResults);
    setErrors(newErrors);
    setIsProcessing(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getAllFormattedText = () => {
    const header = `# Export vom ${new Date().toLocaleString()}\n`;
    const body = results.flatMap(r => r.formattedOutput).sort().join('\n');
    return header + body;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
          ShiftPlan AI <span className="text-blue-600">Multimodal</span>
        </h1>
        <p className="text-slate-600 max-w-2xl mx-auto">
          Extract employee data from Emails, Screenshots, Photos, or PDFs.
          Supports .txt, .pdf, .jpg, and .png.
        </p>
      </header>

      <div className="flex justify-center mb-8">
        <div className="inline-flex p-1 bg-slate-200 rounded-xl">
          <button
            onClick={() => setActiveTab('input')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'input' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Inputs
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'results' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Results
          </button>
        </div>
      </div>

      {activeTab === 'input' ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex gap-4">
              <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors">
                <Upload size={18} />
                Upload Files
                <input type="file" multiple accept=".txt,.pdf,.png,.jpg,.jpeg" onChange={handleFileUpload} className="hidden" />
              </label>
              <button 
                onClick={addManualInput}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors"
              >
                <FileText size={18} />
                Add Text
              </button>
            </div>
            
            <button
              onClick={processInputs}
              disabled={inputs.length === 0 || isProcessing}
              className={`px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all ${inputs.length > 0 && !isProcessing ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
              {isProcessing ? 'Processing...' : 'Run Extraction'}
              <Play size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {inputs.length === 0 && (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl">
                <Info size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-400 font-medium">No files added yet. Supports Text, Images and PDFs.</p>
              </div>
            )}
            {inputs.map((input) => (
              <InputCard 
                key={input.id} 
                input={input} 
                onRemove={removeInput} 
                onUpdateText={updateTextContent}
                idHint={extractEmployeeId(input)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {isProcessing && (
            <div className="bg-white p-12 rounded-3xl shadow-sm border border-slate-200 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-xl font-bold text-slate-800">Processing Multimodal Data...</h3>
              <p className="text-slate-500 mt-2">Gemini is looking for IDs and dates in your files.</p>
            </div>
          )}

          {!isProcessing && results.length > 0 && (
            <div className="space-y-6">
              <div className="bg-slate-900 rounded-3xl p-8 shadow-xl text-white">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <CheckCircle className="text-emerald-400" />
                      Final Configuration
                    </h2>
                  </div>
                  <button
                    onClick={() => copyToClipboard(getAllFormattedText())}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-all font-medium text-sm"
                  >
                    <Copy size={16} />
                    Copy All
                  </button>
                </div>
                <div className="bg-black/30 rounded-2xl p-6 mono text-blue-300 text-sm leading-relaxed whitespace-pre overflow-x-auto border border-white/5">
                  {getAllFormattedText()}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {results.map((res, idx) => (
                  <ResultCard key={idx} result={res} onCopy={copyToClipboard} />
                ))}
              </div>
            </div>
          )}

          {!isProcessing && errors.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-red-600 flex items-center gap-2 px-2">
                <AlertCircle size={20} />
                Errors ({errors.length})
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {errors.map((err, idx) => (
                  <div key={idx} className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3">
                    <div className="bg-red-100 p-1.5 rounded-lg text-red-600">
                      <AlertCircle size={16} />
                    </div>
                    <div>
                      <span className="font-bold text-red-800 text-sm block">{err.fileName}</span>
                      <span className="text-red-700 text-sm">{err.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const InputCard: React.FC<{ 
  input: InputItem; 
  onRemove: (id: string) => void; 
  onUpdateText: (id: string, text: string) => void;
  idHint: string | null;
}> = ({ input, onRemove, onUpdateText, idHint }) => {
  const isImage = input.mimeType.startsWith('image/');
  const isPdf = input.mimeType === 'application/pdf';
  const isText = input.mimeType === 'text/plain';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isImage ? <ImageIcon size={16} className="text-blue-500" /> : isPdf ? <FileIcon size={16} className="text-red-500" /> : <FileText size={16} className="text-slate-500" />}
          <span className="text-sm font-semibold text-slate-700 truncate max-w-[200px]">
            {input.name}
          </span>
        </div>
        <button onClick={() => onRemove(input.id)} className="text-slate-400 hover:text-red-500 transition-colors">
          <Trash2 size={16} />
        </button>
      </div>
      
      <div className="flex-1 min-h-[160px]">
        {isText ? (
          <textarea
            className="w-full h-full min-h-[160px] p-5 text-sm focus:outline-none resize-none bg-transparent"
            placeholder="Paste text here..."
            value={input.content}
            onChange={(e) => onUpdateText(input.id, e.target.value)}
          />
        ) : isImage ? (
          <div className="relative h-40 bg-slate-100 flex items-center justify-center p-4">
            <img 
              src={`data:${input.mimeType};base64,${input.base64}`} 
              className="max-h-full max-w-full object-contain rounded-lg shadow-sm" 
              alt="Preview" 
            />
          </div>
        ) : (
          <div className="h-40 bg-slate-100 flex flex-col items-center justify-center p-4 text-slate-400">
            <FileIcon size={32} className="mb-2" />
            <span className="text-xs font-medium">PDF Document</span>
            <span className="text-[10px] uppercase mt-1">Ready for analysis</span>
          </div>
        )}
      </div>

      <div className="px-5 py-2 bg-slate-50 flex justify-between items-center text-xs">
        <span className={idHint ? 'text-emerald-600 font-medium' : 'text-amber-500 font-medium italic'}>
          {idHint ? `Found: ${idHint}` : 'No ID found in name'}
        </span>
        <span className="text-slate-400 uppercase font-bold text-[10px]">{input.mimeType.split('/')[1]}</span>
      </div>
    </div>
  );
};

const ResultCard: React.FC<{ result: ProcessingResult; onCopy: (text: string) => void }> = ({ result, onCopy }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold text-xs">
            {result.employeeId !== 'unbekannt' ? result.employeeId.split('_')[1] : '?'}
          </div>
          <div className="leading-tight">
            <h4 className="font-bold text-slate-800 text-sm">{result.employeeId}</h4>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              {result.fileName}
            </span>
          </div>
        </div>
        <button 
          onClick={() => onCopy(result.formattedOutput.join('\n'))}
          className="text-slate-400 hover:text-blue-600 transition-colors"
        >
          <Copy size={16} />
        </button>
      </div>
      
      <div className="p-5 flex-1">
        <div className="space-y-2 mb-4">
          {result.formattedOutput.length > 0 ? (
            result.formattedOutput.map((line, i) => (
              <div key={i} className="mono text-xs bg-slate-100 text-slate-700 p-2 rounded-lg border border-slate-200">
                {line}
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 italic">No preferences detected.</p>
          )}
        </div>

        {result.rawText && (
          <>
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-tight"
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {isExpanded ? 'Hide Source' : 'View Source Text'}
            </button>
            {isExpanded && (
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-[12px] text-slate-600 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                {result.rawText}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default App;
