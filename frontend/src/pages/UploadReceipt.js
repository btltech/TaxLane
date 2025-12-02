import React, { useState } from 'react';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';
import API_URL from '../config/api';
import { processOCR } from '../utils/ocr';
import { recognizeWithWorker } from '../utils/ocrWorkerClient';
import { categorizeExpenseText } from '../utils/categories';

// Use a local public worker file to avoid bundler import issues.
// Ensure `public/pdf.worker.min.js` exists (copy from `node_modules/pdfjs-dist/build/pdf.worker.min.js`).
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

function UploadReceipt() {
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState('');
  const [ocrText, setOcrText] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');

  const recognizeText = async (inputFile) => {
    try {
      return await recognizeWithWorker(inputFile);
    } catch (err) {
      return processOCR(inputFile);
    }
  };

  const runOCR = async (selectedFile) => {
    if (!selectedFile) return;
    setLoading(true);
    setProgress('Starting OCR…');
    if (selectedFile.type === 'application/pdf') {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      let combinedText = '';
      for (let p = 1; p <= numPages; p += 1) {
        setProgress(`Processing page ${p} of ${numPages}`);
        const page = await pdf.getPage(p);
        const scale = 2;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;
        const blob = await new Promise((resolve) => canvas.toBlob(resolve));
        const imageFilePage = new File([blob], `pdf-page-${p}.png`, { type: 'image/png' });
        const text = await recognizeText(imageFilePage);
        combinedText += `\n${text}`;
      }
      setOcrText(combinedText.trim());
      setCategory(categorizeExpenseText(combinedText));
    } else if (selectedFile.type.startsWith('image/')) {
      setProgress('Processing image…');
      const text = await recognizeText(selectedFile);
      setOcrText(text);
      setCategory(categorizeExpenseText(text));
    } else {
      alert('Unsupported file type. Please upload an image or PDF.');
    }
    setLoading(false);
    setProgress('');
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    runOCR(selectedFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('receipt', file);
    formData.append('category', category);
    await axios.post(`${API_URL}/api/receipts`, formData, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
    alert('Receipt uploaded!');
    window.location.href = '/';
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="card">
        <h2 className="text-xl font-semibold mb-6 text-slate-800">Upload Receipt</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-500 transition-colors">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
              required
            />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
              <span className="text-4xl mb-2">📄</span>
              <span className="text-sm font-medium text-slate-700">
                {file ? file.name : 'Click to upload or drag and drop'}
              </span>
              <span className="text-xs text-slate-500 mt-1">PDF, PNG, JPG up to 10MB</span>
            </label>
          </div>

          {loading && (
            <div className="bg-blue-50 p-4 rounded-md flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
              <p className="text-sm text-blue-700">{progress || 'Processing OCR…'}</p>
            </div>
          )}

          {ocrText && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Extracted Text</label>
              <textarea
                value={ocrText}
                readOnly
                className="w-full p-3 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono text-slate-600"
                rows="6"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select Category</option>
              <option value="Office">Office</option>
              <option value="Travel">Travel</option>
              <option value="Meals">Meals</option>
              <option value="Communications">Communications</option>
              <option value="Equipment">Equipment</option>
              <option value="Marketing">Marketing</option>
              <option value="Professional Services">Professional Services</option>
              <option value="Utilities">Utilities</option>
              <option value="Insurance">Insurance</option>
              <option value="Training">Training</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Medical">Medical</option>
              <option value="Subscriptions">Subscriptions</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || loading}
              className="btn btn-primary bg-green-600 hover:bg-green-700 focus:ring-green-500"
            >
              Upload Receipt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UploadReceipt;
