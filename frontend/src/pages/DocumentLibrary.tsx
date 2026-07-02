import { useState } from 'react';
import { UploadCloud, FileText, Search, Trash2, CheckCircle2, Clock, AlertCircle, Tag, Plus, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';

interface Document {
  id: string;
  name: string;
  status: 'ready' | 'processing' | 'failed';
  pageCount: number;
  uploadDate: string;
  category: string;
  uploader: string;
  size: string;
}

const mockDocuments: Document[] = [
  { id: '1', name: 'HR_Policy_2024.pdf',          status: 'ready',      pageCount: 24,  uploadDate: '2024-03-10', category: 'HR',          uploader: 'admin',   size: '2.4 MB' },
  { id: '2', name: 'Q3_Financials.docx',           status: 'ready',      pageCount: 15,  uploadDate: '2024-03-12', category: 'Finance',     uploader: 'analyst', size: '1.1 MB' },
  { id: '3', name: 'Architecture_Diagram.png',     status: 'processing', pageCount: 1,   uploadDate: '2024-03-15', category: 'Engineering', uploader: 'analyst', size: '4.5 MB' },
  { id: '4', name: 'Legacy_Contracts_Scanned.pdf', status: 'failed',     pageCount: 120, uploadDate: '2024-03-16', category: 'Legal',       uploader: 'admin',   size: '15.2 MB' },
  { id: '5', name: 'Product_Roadmap_2025.pdf',     status: 'ready',      pageCount: 32,  uploadDate: '2024-03-17', category: 'Strategy',    uploader: 'admin',   size: '3.8 MB' },
];

const statusBadge = {
  ready:      { label: 'Ready',      className: 'bg-brand-teal/10 text-brand-teal',  Icon: CheckCircle2 },
  processing: { label: 'Processing', className: 'bg-brand-blue/10 text-brand-blue',  Icon: Clock },
  failed:     { label: 'Failed',     className: 'bg-brand-coral/10 text-brand-coral', Icon: AlertCircle },
};

const categoryColor: Record<string, string> = {
  HR:          'bg-brand-coral/10 text-brand-coral',
  Finance:     'bg-brand-teal/10 text-brand-teal',
  Engineering: 'bg-brand-blue/10 text-brand-blue',
  Legal:       'bg-purple-50 text-purple-600',
  Strategy:    'bg-brand-lime/30 text-brand-dark',
};

export function DocumentLibrary() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>(mockDocuments);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);

  const canUpload = user?.role === 'admin' || user?.role === 'analyst';
  const canDelete = user?.role === 'admin';

  const filtered = documents.filter(doc => {
    if (user?.role === 'viewer' && doc.category === 'HR') return false;
    return !search || doc.name.toLowerCase().includes(search.toLowerCase());
  });

  const handleDelete = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const summaryStats = [
    { label: 'Total Docs',  value: documents.length,                         color: 'bg-brand-blue/10 text-brand-blue'   },
    { label: 'Ready',       value: documents.filter(d => d.status === 'ready').length,      color: 'bg-brand-teal/10 text-brand-teal'   },
    { label: 'Processing',  value: documents.filter(d => d.status === 'processing').length, color: 'bg-brand-lime/30 text-brand-dark'   },
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
          <h3 className="text-base font-semibold text-brand-dark mb-1">Drop files to upload</h3>
          <p className="text-sm text-slate-400 mb-5">PDF, DOCX, or image files up to 50 MB</p>
          <button className="btn-secondary">Browse Files</button>
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                    <p className="text-slate-400 text-sm">No documents found</p>
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
                          <p className="font-semibold text-brand-dark text-sm truncate max-w-[220px]">{doc.name}</p>
                          <p className="text-xs text-slate-400">{doc.size} · {doc.pageCount} pages</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={cn('badge', categoryColor[doc.category] ?? 'bg-slate-100 text-slate-500')}>
                        {doc.category}
                      </span>
                    </td>
                    <td>
                      <span className={cn('badge flex items-center gap-1 w-fit', s.className)}>
                        <s.Icon className="w-3.5 h-3.5" />
                        {s.label}
                      </span>
                    </td>
                    <td>
                      <p className="text-sm text-brand-dark">{doc.uploadDate}</p>
                      <p className="text-xs text-slate-400">by {doc.uploader}</p>
                    </td>
                    {canDelete && (
                      <td className="text-right">
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="p-2 text-slate-300 hover:text-brand-coral hover:bg-brand-coral/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
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
