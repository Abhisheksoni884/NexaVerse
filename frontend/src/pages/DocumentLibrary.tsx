import { useState, useEffect, useRef } from 'react';
import { UploadCloud, FileText, Search, Trash2, CheckCircle2, Clock, AlertCircle, Plus, X, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';
import { documentsAPI, type Document as ApiDocument } from '../utils/api';

interface Document {
  id: string;
  name: string;          // mapped from backend `filename`
  status: 'uploading' | 'extracting' | 'chunking' | 'indexing' | 'ready' | 'failed';
  pageCount?: number;
  chunkCount?: number;
  uploadDate: string;    // formatted from backend `created_at`
  category: string;
  uploader: string;
  sizeDisplay?: string;  // formatted from backend `file_size_bytes`
  error?: string;
}

const statusBadge = {
  uploading:  { label: 'Uploading',  className: 'bg-brand-blue/10 text-brand-blue',  Icon: Clock },
  extracting: { label: 'Extracting', className: 'bg-brand-blue/10 text-brand-blue',  Icon: Clock },
  chunking:   { label: 'Chunking',   className: 'bg-brand-blue/10 text-brand-blue',  Icon: Clock },
  indexing:   { label: 'Indexing',   className: 'bg-brand-blue/10 text-brand-blue',  Icon: Clock },
  ready:      { label: 'Ready',      className: 'bg-brand-teal/10 text-brand-teal',  Icon: CheckCircle2 },
  failed:     { label: 'Failed',     className: 'bg-brand-coral/10 text-brand-coral', Icon: AlertCircle },
};

const categoryColor: Record<string, string> = {
  general:     'bg-slate-100 text-slate-600',
  HR:          'bg-brand-coral/10 text-brand-coral',
  Finance:     'bg-brand-teal/10 text-brand-teal',
  Engineering: 'bg-brand-blue/10 text-brand-blue',
  Legal:       'bg-purple-50 text-purple-600',
  Strategy:    'bg-brand-lime/30 text-brand-dark',
  Marketing:   'bg-pink-50 text-pink-600',
  Sales:       'bg-orange-50 text-orange-600',
};

const CATEGORIES = ['general', 'HR', 'Finance', 'Engineering', 'Legal', 'Strategy', 'Marketing', 'Sales'];

export function DocumentLibrary() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('general');
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const canUpload = user?.role === 'admin' || user?.role === 'analyst';
  const canDelete = user?.role === 'admin';

  useEffect(() => {
    loadDocuments();
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const loadDocuments = async () => {
    try {
      setError('');
      const docs = await documentsAPI.list();
      setDocuments(docs.map(mapApiDocument));
      setLoading(false);

      // Check if any documents are processing
      const processingDocs = docs.filter(d => 
        d.status !== 'ready' && d.status !== 'failed'
      );
      
      if (processingDocs.length > 0 && !pollIntervalRef.current) {
        // Start polling for status updates
        pollIntervalRef.current = setInterval(pollDocumentStatus, 3000);
      } else if (processingDocs.length === 0 && pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    } catch (err: any) {
      console.error('Failed to load documents:', err);
      setError(err.response?.data?.detail || 'Failed to load documents');
      setLoading(false);
    }
  };

  const pollDocumentStatus = async () => {
    const processingDocs = documents.filter(d => 
      d.status !== 'ready' && d.status !== 'failed'
    );
    
    for (const doc of processingDocs) {
      try {
        const status = await documentsAPI.getStatus(doc.id);
        setDocuments(prev => prev.map(d => 
          d.id === doc.id 
            ? { ...d, status: status.status as any, error: status.error_message || undefined }
            : d
        ));
      } catch (err) {
        console.error(`Failed to poll status for ${doc.id}`, err);
      }
    }

    // Stop polling if all done
    const stillProcessing = documents.some(d => 
      d.status !== 'ready' && d.status !== 'failed'
    );
    if (!stillProcessing && pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const mapApiDocument = (doc: ApiDocument): Document => ({
    id: doc.id,
    name: doc.filename,           // backend returns `filename`
    status: doc.status,
    pageCount: doc.page_count,
    chunkCount: doc.chunk_count,
    uploadDate: new Date(doc.created_at).toLocaleDateString('en-US', {  // backend returns `created_at`
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
    category: doc.category,
    uploader: doc.uploader,
    sizeDisplay: formatFileSize(doc.file_size_bytes),  // backend returns `file_size_bytes`
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadProgress(`Uploading ${file.name}...`);
      await documentsAPI.upload(file, uploadCategory);
      setUploadProgress('Upload successful! Processing document...');
      await loadDocuments();
      
      // Start polling if not already
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(pollDocumentStatus, 3000);
      }

      setTimeout(() => {
        setUploadProgress('');
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 2000);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.response?.data?.detail || 'Upload failed');
      setUploadProgress('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

    try {
      await documentsAPI.delete(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch (err: any) {
      console.error('Delete failed:', err);
      setError(err.response?.data?.detail || 'Delete failed');
    }
  };

  const filtered = documents.filter(doc => {
    return !search || doc.name.toLowerCase().includes(search.toLowerCase());
  });

  const summaryStats = [
    { label: 'Total Docs',  value: documents.length,                         color: 'bg-brand-blue/10 text-brand-blue'   },
    { label: 'Ready',       value: documents.filter(d => d.status === 'ready').length,      color: 'bg-brand-teal/10 text-brand-teal'   },
    { label: 'Processing',  value: documents.filter(d => d.status !== 'ready' && d.status !== 'failed').length, color: 'bg-brand-lime/30 text-brand-dark'   },
    { label: 'Failed',      value: documents.filter(d => d.status === 'failed').length,     color: 'bg-brand-coral/10 text-brand-coral' },
  ];

  return (
    <div className="flex flex-col space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-dark">Document Library</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage enterprise documents available for AI retrieval</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadDocuments}
            disabled={loading}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Refresh
          </button>
          {canUpload && (
            <button
              onClick={() => setUploading(!uploading)}
              className="btn-primary flex items-center gap-2"
            >
              {uploading ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {uploading ? 'Cancel' : 'Upload Document'}
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 animate-fade-in">
          {error}
        </div>
      )}

      {/* Upload progress */}
      {uploadProgress && (
        <div className="text-sm text-brand-teal bg-brand-teal/10 border border-brand-teal/20 rounded-xl px-4 py-3 animate-fade-in">
          {uploadProgress}
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {summaryStats.map(s => (
          <div key={s.label} className={`rounded-2xl p-5 ${s.color.split(' ')[0]}`}>
            <p className={`text-xs font-semibold ${s.color.split(' ')[1]} opacity-70`}>{s.label}</p>
            <p className={`text-3xl font-extrabold ${s.color.split(' ')[1]} mt-1`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Upload zone */}
      {uploading && (
        <div className="card border-2 border-dashed border-brand-blue/30 p-8 text-center animate-fade-in">
          <div className="w-14 h-14 bg-brand-blue/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UploadCloud className="w-7 h-7 text-brand-blue" />
          </div>
          <h3 className="text-base font-semibold text-brand-dark mb-1">Upload a document</h3>
          <p className="text-sm text-slate-400 mb-5">PDF, DOCX, or image files up to 50 MB</p>
          
          <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
            <div className="w-full">
              <label className="block text-xs font-semibold text-slate-700 mb-2 text-left">Category</label>
              <select
                value={uploadCategory}
                onChange={e => setUploadCategory(e.target.value)}
                className="form-input w-full"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.png,.jpg,.jpeg"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="btn-secondary cursor-pointer">
              Browse Files
            </label>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden flex-1">
        {/* Search */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search documents…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="form-input pl-10 py-2"
            />
          </div>
          <span className="text-xs text-slate-400">{filtered.length} document{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full data-table min-w-[700px]">
            <thead>
              <tr>
                <th>Document</th>
                <th>Category</th>
                <th>Status</th>
                <th>Uploaded</th>
                {canDelete && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <RefreshCw className="w-8 h-8 mx-auto mb-2 text-brand-blue animate-spin" />
                    <p className="text-slate-400 text-sm">Loading documents...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                    <p className="text-slate-400 text-sm">
                      {search ? 'No documents match your search' : 'No documents uploaded yet'}
                    </p>
                  </td>
                </tr>
              ) : filtered.map(doc => {
                const s = statusBadge[doc.status];
                return (
                  <tr key={doc.id} className="group">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-brand-blue" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-brand-dark text-sm truncate max-w-[220px]" title={doc.name}>
                            {doc.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {doc.sizeDisplay ?? 'Unknown size'}
                            {doc.pageCount ? ` · ${doc.pageCount} pages` : ''}
                            {doc.chunkCount ? ` · ${doc.chunkCount} chunks` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={cn('badge', categoryColor[doc.category] ?? 'bg-slate-100 text-slate-500')}>
                        {doc.category}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <span className={cn('badge flex items-center gap-1 w-fit', s.className)}>
                          <s.Icon className="w-3.5 h-3.5" />
                          {s.label}
                        </span>
                        {doc.error && (
                          <p className="text-xs text-brand-coral truncate max-w-[200px]" title={doc.error}>
                            {doc.error}
                          </p>
                        )}
                      </div>
                    </td>
                    <td>
                      <p className="text-sm text-brand-dark">{doc.uploadDate}</p>
                      <p className="text-xs text-slate-400">by {doc.uploader}</p>
                    </td>
                    {canDelete && (
                      <td className="text-right">
                        <button
                          onClick={() => handleDelete(doc.id, doc.name)}
                          className="p-2 text-slate-300 hover:text-brand-coral hover:bg-brand-coral/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                          title="Delete document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
