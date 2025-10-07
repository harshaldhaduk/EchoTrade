import { useState } from "react";
import { TickerSearch } from "@/components/TickerSearch";
import { NewsList, NewsItem } from "@/components/NewsList";
import { TrendingUp } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [currentTicker, setCurrentTicker] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (ticker: string) => {
    setIsLoading(true);
    setCurrentTicker(ticker);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-news`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ ticker }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch news');
      }

      const data = await response.json();
      setNews(data.news || []);
      
      if (data.cached) {
        toast.info(`Showing cached results for ${ticker}`);
      } else {
        toast.success(`Found ${data.news?.length || 0} articles for ${ticker}`);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
      toast.error('Failed to fetch news. Please try again.');
      setNews([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Hero Section */}
      <header className="border-b border-border bg-background/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity w-fit">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">EchoTrade</h1>
              <p className="text-sm text-muted-foreground">
                Real-time stock news & sentiment analysis
              </p>
            </div>
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="space-y-12">
          {/* Search Section */}
          <div className="text-center space-y-6">
            <div className="space-y-3">
              <h2 className="text-4xl md:text-5xl font-bold text-foreground">
                Stay Ahead of the Market
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Get curated news, insights, and sentiment analysis for any stock ticker in
                real-time
              </p>
            </div>
            <TickerSearch onSearch={handleSearch} isLoading={isLoading} />
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
              <p className="mt-4 text-muted-foreground">
                Fetching latest news for {currentTicker}...
              </p>
            </div>
          )}

          {/* Results */}
          {!isLoading && news.length > 0 && (
            <NewsList news={news} ticker={currentTicker} />
          )}

          {/* Empty State */}
          {!isLoading && currentTicker && news.length === 0 && (
            <div className="text-center py-12 space-y-3">
              <p className="text-xl text-foreground">No news found for {currentTicker}</p>
              <p className="text-muted-foreground">
                Try another ticker or check back later
              </p>
            </div>
          )}

          {/* Features Section (shown when no search yet) */}
          {!currentTicker && (
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto pt-8">
              <div className="p-6 rounded-lg bg-card border border-border text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">Real-Time Updates</h3>
                <p className="text-sm text-muted-foreground">
                  Get the latest news as it happens from trusted sources
                </p>
              </div>
              <div className="p-6 rounded-lg bg-card border border-border text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">Sentiment Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Understand market sentiment with bullish/bearish indicators
                </p>
              </div>
              <div className="p-6 rounded-lg bg-card border border-border text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">Easy Export</h3>
                <p className="text-sm text-muted-foreground">
                  Copy or export news summaries for quick decision-making
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
