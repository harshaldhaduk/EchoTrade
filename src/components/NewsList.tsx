import { NewsCard, SentimentType } from "./NewsCard";
import { Download, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  timestamp: string;
  summary: string;
  sentiment: SentimentType;
  url: string;
}

interface NewsListProps {
  news: NewsItem[];
  ticker: string;
}

export const NewsList = ({ news, ticker }: NewsListProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = news
      .map(
        (item) =>
          `${item.headline}\n${item.source} • ${item.timestamp}\nSentiment: ${item.sentiment}\n${item.summary}\n${item.url}\n`
      )
      .join("\n---\n\n");

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("News copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const csvContent =
      "Headline,Source,Timestamp,Sentiment,Summary,URL\n" +
      news
        .map(
          (item) =>
            `"${item.headline}","${item.source}","${item.timestamp}","${item.sentiment}","${item.summary}","${item.url}"`
        )
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ticker}_news_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("News exported to CSV");
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Latest News for <span className="text-primary">{ticker}</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {news.length} article{news.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="border-border hover:border-primary/50"
          >
            {copied ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="border-border hover:border-primary/50"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {news.map((item) => (
          <NewsCard key={item.id} {...item} />
        ))}
      </div>
    </div>
  );
};
