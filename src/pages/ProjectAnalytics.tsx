import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ProjectAnalytics = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Project Analytics</h1>
          <p className="text-sm text-muted-foreground">Powered by Raisn.ai</p>
        </div>
        <div className="flex items-center justify-center h-64 border border-dashed border-muted-foreground/25 rounded-lg">
          <p className="text-muted-foreground">Analytics dashboard coming soon...</p>
        </div>
      </div>
    </div>
  );
};

export default ProjectAnalytics;
