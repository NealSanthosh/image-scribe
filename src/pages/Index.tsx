import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles, BookOpen } from "lucide-react";

interface StoryboardScene {
  sequence: number;
  description: string;
  imageUrl: string;
}

const Index = () => {
  const [story, setStory] = useState("");
  const [storyboard, setStoryboard] = useState<StoryboardScene[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!story.trim()) {
      toast.error("Please enter a story first!");
      return;
    }

    setIsGenerating(true);
    setStoryboard([]);

    try {
      const { data, error } = await supabase.functions.invoke('generate-storyboard', {
        body: { story }
      });

      if (error) throw error;

      if (data?.storyboard && data.storyboard.length > 0) {
        setStoryboard(data.storyboard);
        toast.success(`Generated ${data.storyboard.length} storyboard scenes!`);
      } else {
        toast.error("No scenes were generated. Please try again.");
      }
    } catch (error) {
      console.error('Error generating storyboard:', error);
      toast.error("Failed to generate storyboard. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BookOpen className="w-12 h-12 text-purple-600" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Story Storyboard Generator
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transform children's stories into beautiful illustrated storyboards using AI
          </p>
        </div>

        {/* Input Section */}
        <Card className="max-w-4xl mx-auto p-8 mb-12 shadow-xl">
          <div className="space-y-6">
            <div>
              <label className="text-lg font-semibold mb-3 block text-foreground">
                Enter Your Children's Story
              </label>
              <Textarea
                value={story}
                onChange={(e) => setStory(e.target.value)}
                placeholder="Once upon a time, in a magical forest far away..."
                className="min-h-[200px] text-base resize-none"
                disabled={isGenerating}
              />
            </div>
            
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !story.trim()}
              className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating Storyboard...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate Storyboard
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Storyboard Results */}
        {storyboard.length > 0 && (
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8 text-foreground">
              Your Storyboard
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {storyboard.map((scene) => (
                <Card key={scene.sequence} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                  <div className="aspect-video relative bg-gradient-to-br from-purple-100 to-pink-100">
                    <img
                      src={scene.imageUrl}
                      alt={`Scene ${scene.sequence}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-full w-10 h-10 flex items-center justify-center font-bold text-purple-600 shadow-md">
                      {scene.sequence}
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {scene.description}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isGenerating && (
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-12">
              <Loader2 className="w-16 h-16 animate-spin text-purple-600 mx-auto mb-4" />
              <p className="text-lg text-muted-foreground">
                Creating your magical storyboard...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
