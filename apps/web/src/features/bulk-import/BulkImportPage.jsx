import React, { useState, useRef } from 'react';
import apiClient from '../../api/client.js';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, Download, ArrowRight } from 'lucide-react';

export default function BulkImportPage() {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setResult(null);
    }
  };

  const handleUploadAndImport = async () => {
    if (!file) return;

    setImporting(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await apiClient.post('/posts/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Bulk import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadSampleCsv = () => {
    const csvContent =
      'post_id,client_name,brand_id,topic,caption,hashtags,platforms,post_type,media_urls,scheduled_date,scheduled_time,timezone,status,first_comment,link_url,published_at_utc,platform_post_ids,error_message,last_updated_by\n' +
      'PP-2026-000101,Acme Foods India,acme-foods,Diwali Special,Celebrate authentic aromatic spices!,#diwali #spices,"facebook,instagram,linkedin",image,https://images.unsplash.com/photo-1546069901-ba9599a7e63c,2026-11-01,18:30,Asia/Kolkata,Scheduled,Visit link in bio!,,,,,system\n' +
      'PP-2026-000102,Nova Tech USA,nova-tech,AI Launch,Next-generation AI agents are here!,#AI #SaaS,"facebook,twitter,linkedin",text,,2026-11-02,10:00,America/New_York,Scheduled,,,https://novatech.ai,,,system';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'postpilot_schedule_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Bulk Upload Schedule</h1>
          <p className="text-slate-500 text-sm mt-1">
            Import posts directly from CSV or Excel files matching your Google Sheet Schedule data contract.
          </p>
        </div>

        <button
          onClick={handleDownloadSampleCsv}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
        >
          <Download className="w-4 h-4" />
          <span>Download Sample CSV</span>
        </button>
      </div>

      {/* Upload Box */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-3xl p-10 text-center cursor-pointer bg-white transition hover:bg-slate-50/50"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv,.xlsx"
          className="hidden"
        />

        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <FileSpreadsheet className="w-7 h-7" />
        </div>

        <h3 className="font-bold text-slate-800 text-base">
          {file ? file.name : 'Select or drop your CSV or Excel (.xlsx) file'}
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          The file must follow the 19-column Google Sheet specification. Columns include post_id, client_name, platforms, scheduled_date, scheduled_time, and timezone.
        </p>

        {file && (
          <div className="mt-5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleUploadAndImport();
              }}
              disabled={importing}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              {importing ? 'Validating and Importing...' : 'Validate & Import Posts'}
            </button>
          </div>
        )}
      </div>

      {/* Results View */}
      {result && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base">Import Results</h3>
            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg">
              {result.imported} of {result.total} posts successfully scheduled
            </span>
          </div>

          {result.errors?.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-red-600 uppercase tracking-wider">
                Row Validation Errors ({result.errors.length})
              </h4>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {result.errors.map((err, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-start space-x-2"
                  >
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Row {err.row} ({err.postId}): </strong>
                      <span>{err.error}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2 font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>All rows passed schema validation and have been scheduled to your content calendar!</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
