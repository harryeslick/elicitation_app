
import React, { useRef } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { DownloadIcon } from './icons/DownloadIcon';

interface ControlPanelProps {
    onUpload: (file: File) => void;
    onDownload: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ onUpload, onDownload }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onUpload(file);
        }
        // Reset file input to allow uploading the same file again
        event.target.value = '';
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
             <h2 className="text-xl font-semibold mb-4 text-gray-800">Session Management</h2>
            <div className="flex flex-col sm:flex-row gap-4">
                <button
                    onClick={handleUploadClick}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                    <UploadIcon className="w-5 h-5 mr-2" />
                    Upload Session (.csv)
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".csv"
                    className="hidden"
                />
                <button
                    onClick={onDownload}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                >
                    <DownloadIcon className="w-5 h-5 mr-2" />
                    Download Results (.csv)
                </button>
            </div>
        </div>
    );
};
