import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../../api/client.js';
import Modal from '../../components/Modal.jsx';
import {
  UploadCloud,
  Image as ImageIcon,
  Video,
  Copy,
  Check,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  Grid,
  List,
  ExternalLink,
  Info,
} from 'lucide-react';

export default function MediaLibraryPage() {
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'image' | 'video'
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  // Upload state
  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);
  const fileInputRef = useRef(null);

  // Copied URL state
  const [copiedId, setCopiedId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Selected asset for platform specs modal
  const [inspectAsset, setInspectAsset] = useState(null);
  const [specValidation, setSpecValidation] = useState(null);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterType !== 'all') params.type = filterType;
      if (searchTerm) params.search = searchTerm;

      const { data } = await apiClient.get('/media', { params });
      setMediaList(data.data || []);
    } catch (err) {
      console.warn('Failed to load media assets:', err.message);
      setMediaList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [filterType, searchTerm]);

  // Upload handler
  const handleFiles = async (files) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    for (const file of fileArray) {
      const uploadId = Math.random().toString(36).substring(7);
      setUploadQueue((prev) => [
        ...prev,
        { id: uploadId, name: file.name, progress: 10, status: 'uploading' },
      ]);

      const formData = new FormData();
      formData.append('file', file);

      try {
        await apiClient.post('/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadQueue((prev) =>
              prev.map((item) =>
                item.id === uploadId ? { ...item, progress: percent } : item
              )
            );
          },
        });

        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === uploadId ? { ...item, progress: 100, status: 'completed' } : item
          )
        );

        showToast(`Uploaded ${file.name} successfully!`);
        fetchMedia();
      } catch (err) {
        const errorMsg = err.response?.data?.message || 'Upload failed';
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === uploadId
              ? { ...item, status: 'error', error: errorMsg }
              : item
          )
        );
        showToast(`Failed to upload ${file.name}: ${errorMsg}`, true);
      }
    }
  };

  const handleCopyUrl = (asset) => {
    navigator.clipboard.writeText(asset.publicUrl);
    setCopiedId(asset.id);
    showToast('URL copied to clipboard! Ready to paste into Google Sheet.');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await apiClient.delete(`/media/${id}`);
      showToast(`Deleted ${name}`);
      setMediaList((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      showToast('Failed to delete media asset', true);
    }
  };

  const handleInspectSpecs = async (asset) => {
    setInspectAsset(asset);
    try {
      const { data } = await apiClient.post('/media/validate', {
        asset,
        platforms: ['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'TWITTER', 'YOUTUBE', 'TIKTOK', 'PINTEREST'],
      });
      setSpecValidation(data.data);
    } catch (err) {
      console.error('Validation check error:', err);
    }
  };

  const showToast = (msg, isError = false) => {
    setToastMessage({ msg, isError });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl border flex items-center space-x-3 transition-all ${
            toastMessage.isError
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {toastMessage.isError ? (
            <AlertTriangle className="w-5 h-5 text-red-600" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          )}
          <span className="text-sm font-semibold">{toastMessage.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Media Library</h1>
          <p className="text-slate-500 text-sm mt-1">
            Upload images & videos, verify platform specifications, and copy CDN URLs for your Google Sheets.
          </p>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition active:scale-95"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Media</span>
        </button>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
            : 'border-slate-300 hover:border-indigo-400 bg-white hover:bg-slate-50/50'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFiles(e.target.files)}
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime"
          className="hidden"
        />
        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
          <UploadCloud className="w-7 h-7" />
        </div>
        <h4 className="font-bold text-slate-800 text-base">Drag & drop your files here, or browse</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Supports JPG, PNG, WebP, GIF, MP4, and MOV up to 500MB. Direct upload generates high-speed public CDN URLs.
        </p>
      </div>

      {/* Active Uploads Queue */}
      {uploadQueue.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-800 text-sm">Upload Progress</h3>
          <div className="space-y-2">
            {uploadQueue.map((item) => (
              <div key={item.id} className="text-xs flex items-center justify-between space-x-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="font-medium text-slate-700 truncate max-w-xs">{item.name}</span>
                <div className="flex items-center space-x-3 shrink-0">
                  <div className="w-32 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${item.status === 'error' ? 'bg-red-500' : 'bg-indigo-600'}`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  <span className="font-semibold text-slate-500 w-8 text-right">{item.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search filenames..."
            className="w-full bg-slate-100 hover:bg-slate-200/70 focus:bg-white text-xs pl-9 pr-3.5 py-2 rounded-xl border border-transparent focus:border-indigo-500 focus:outline-none transition"
          />
        </div>

        {/* Type Filter Pills & View Mode */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg transition ${filterType === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('image')}
              className={`px-3 py-1.5 rounded-lg transition ${filterType === 'image' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'}`}
            >
              Images
            </button>
            <button
              onClick={() => setFilterType('video')}
              className={`px-3 py-1.5 rounded-lg transition ${filterType === 'video' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'}`}
            >
              Videos
            </button>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-slate-500">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Media Grid / List */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
              <div className="h-44 bg-slate-200" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : mediaList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <ImageIcon className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">No media assets found</h3>
          <p className="text-xs text-slate-500 mt-1">Upload photos or videos to start building your media assets library.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {mediaList.map((asset) => {
            const isVideo = asset.mimeType?.startsWith('video/');
            const isCopied = copiedId === asset.id;

            return (
              <div
                key={asset.id}
                className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col"
              >
                {/* Media Preview Thumbnail */}
                <div className="relative aspect-video bg-slate-900 overflow-hidden flex items-center justify-center">
                  {isVideo ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <video src={asset.publicUrl} className="w-full h-full object-cover" muted />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-lg">
                          <Video className="w-5 h-5 ml-0.5" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={asset.thumbnailUrl || asset.publicUrl}
                      alt={asset.originalFilename}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  )}

                  {/* Format Badge */}
                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-slate-900/80 text-white rounded-md backdrop-blur-sm">
                    {asset.mimeType?.split('/')[1]}
                  </span>

                  {/* Dimensions Badge */}
                  {asset.width && asset.height && (
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 text-[10px] font-semibold bg-slate-900/80 text-slate-200 rounded-md backdrop-blur-sm">
                      {asset.width}x{asset.height}
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm truncate" title={asset.originalFilename}>
                      {asset.originalFilename}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatBytes(asset.fileSize)} • {new Date(asset.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleCopyUrl(asset)}
                      className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition ${
                        isCopied
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? 'Copied!' : 'Copy URL'}</span>
                    </button>

                    <button
                      onClick={() => handleInspectSpecs(asset)}
                      title="Inspect Platform Specifications"
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                    >
                      <Info className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(asset.id, asset.originalFilename)}
                      title="Delete Asset"
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Preview</th>
                <th className="py-3 px-4">Filename</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Dimensions</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mediaList.map((asset) => (
                <tr key={asset.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-2.5 px-4">
                    <img
                      src={asset.thumbnailUrl || asset.publicUrl}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover bg-slate-100"
                    />
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-slate-800">{asset.originalFilename}</td>
                  <td className="py-2.5 px-4 text-slate-500 uppercase">{asset.mimeType?.split('/')[1]}</td>
                  <td className="py-2.5 px-4 text-slate-500">{formatBytes(asset.fileSize)}</td>
                  <td className="py-2.5 px-4 text-slate-500">{asset.width ? `${asset.width}x${asset.height}` : '—'}</td>
                  <td className="py-2.5 px-4 text-right space-x-2">
                    <button
                      onClick={() => handleCopyUrl(asset)}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-md transition"
                    >
                      Copy URL
                    </button>
                    <button
                      onClick={() => handleInspectSpecs(asset)}
                      className="p-1 text-slate-400 hover:text-indigo-600 transition"
                    >
                      <Info className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={() => handleDelete(asset.id, asset.originalFilename)}
                      className="p-1 text-slate-400 hover:text-red-600 transition"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Platform Compatibility Modal */}
      <Modal
        isOpen={!!inspectAsset}
        onClose={() => setInspectAsset(null)}
        title="Social Platform Compatibility"
        maxWidth="max-w-2xl"
      >
        {inspectAsset && (
          <div className="space-y-6">
            {/* Asset Overview */}
            <div className="flex items-center space-x-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <img
                src={inspectAsset.thumbnailUrl || inspectAsset.publicUrl}
                alt=""
                className="w-16 h-16 rounded-lg object-cover bg-slate-200 shrink-0"
              />
              <div className="min-w-0 flex-1 text-xs">
                <p className="font-bold text-slate-800 truncate text-sm">{inspectAsset.originalFilename}</p>
                <p className="text-slate-500 mt-0.5">
                  Type: {inspectAsset.mimeType} • Size: {formatBytes(inspectAsset.fileSize)}
                </p>
                {inspectAsset.width && inspectAsset.height && (
                  <p className="text-slate-500">
                    Resolution: {inspectAsset.width}x{inspectAsset.height} px
                  </p>
                )}
              </div>
            </div>

            {/* Validation Breakdown */}
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-3">Platform Specification Audit</h4>

              {specValidation?.warnings?.length === 0 ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center space-x-3 text-emerald-800 text-xs font-semibold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>This media asset is 100% compliant with all major social media platforms!</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {specValidation?.warnings?.map((w, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border flex items-start space-x-3 text-xs ${
                        w.type === 'ERROR'
                          ? 'bg-red-50 border-red-200 text-red-800'
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}
                    >
                      <AlertTriangle
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          w.type === 'ERROR' ? 'text-red-600' : 'text-amber-600'
                        }`}
                      />
                      <div>
                        <span className="font-bold uppercase tracking-wider text-[10px] mr-1.5 px-1.5 py-0.5 rounded bg-white/60">
                          {w.platform}
                        </span>
                        <span>{w.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Direct CDN URL Copy Box */}
            <div className="pt-4 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Public CDN URL (Paste into Google Sheets media_urls column):
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={inspectAsset.publicUrl}
                  className="w-full bg-slate-100 text-xs px-3.5 py-2 rounded-xl border border-slate-200 select-all font-mono text-slate-700 focus:outline-none"
                />
                <button
                  onClick={() => handleCopyUrl(inspectAsset)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shrink-0 transition"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
