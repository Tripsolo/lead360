import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRef } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
}

export const FileUpload = ({ onFileSelect, isLoading }: FileUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors">
        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Upload CRM Excel File</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Drop your Excel file here or click to browse
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
          disabled={isLoading}
        />
        <Button 
          onClick={() => inputRef.current?.click()}
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : 'Select File'}
        </Button>
      </div>
    </div>
  );
};
