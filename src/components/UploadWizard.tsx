import { useState, useRef } from 'react';
import { Upload, Building2, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BRANDS, Brand, Project } from '@/config/projects';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface UploadWizardProps {
  onFileSelect: (file: File, projectId: string) => void;
  isLoading?: boolean;
}

export const UploadWizard = ({ onFileSelect, isLoading }: UploadWizardProps) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [error, setError] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleBrandSelect = (brandId: string) => {
    const brand = BRANDS.find(b => b.id === brandId);
    if (brand) {
      setSelectedBrand(brand);
      setSelectedProject(null);
      setStep(2);
    }
  };

  const handleProjectSelect = (projectId: string) => {
    const project = selectedBrand?.projects.find(p => p.id === projectId);
    if (project) {
      setSelectedProject(project);
      setStep(3);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');

    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Please upload a valid Excel file (.xlsx or .xls)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    if (selectedProject) {
      onFileSelect(file, selectedProject.id);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setSelectedBrand(null);
    } else if (step === 3) {
      setStep(2);
      setSelectedProject(null);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload CRM Data
          </CardTitle>
          <CardDescription>
            Step {step} of 3: {step === 1 ? 'Select Brand' : step === 2 ? 'Select Project' : 'Upload File'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Brand Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium mb-3">
                <Building2 className="h-4 w-4" />
                <span>Select Brand</span>
              </div>
              <Select onValueChange={handleBrandSelect}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a brand..." />
                </SelectTrigger>
                <SelectContent>
                  {BRANDS.map(brand => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Step 2: Project Selection */}
          {step === 2 && selectedBrand && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium mb-3">
                <Home className="h-4 w-4" />
                <span>Select Project under {selectedBrand.name}</span>
              </div>
              <Select onValueChange={handleProjectSelect}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a project..." />
                </SelectTrigger>
                <SelectContent>
                  {selectedBrand.projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleBack} size="sm">
                Back
              </Button>
            </div>
          )}

          {/* Step 3: File Upload */}
          {step === 3 && selectedProject && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-medium">Selected Project:</p>
                <p className="text-lg font-semibold">{selectedProject.name}</p>
                <p className="text-sm text-muted-foreground">{selectedProject.metadata.location}</p>
              </div>

              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                <h3 className="text-base font-semibold mb-2">Upload Excel File</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Maximum 50 leads per file. Drag & drop or click to browse.
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

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button variant="outline" onClick={handleBack} size="sm">
                Back
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
