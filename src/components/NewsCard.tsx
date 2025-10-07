import { ExternalLink, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type SentimentType = "bullish" | "bearish" | "neutral";

interface NewsCardProps {
  headline: string;
  source: string;
  timestamp: string;
  summary: string;
  sentiment: SentimentType;
  url: string;
}

const SentimentIcon = ({ sentiment }: { sentiment: SentimentType }) => {
  switch (sentiment) {
    case "bullish":
      return <TrendingUp className="h-4 w-4" />;
    case "bearish":
      return <TrendingDown className="h-4 w-4" />;
    default:
      return <Minus className="h-4 w-4" />;
  }
};

const sentimentColors = {
  bullish: "bg-bullish/20 text-bullish border-bullish/30",
  bearish: "bg-bearish/20 text-bearish border-bearish/30",
  neutral: "bg-neutral/20 text-neutral border-neutral/30",
};

export const NewsCard = ({
  headline,
  source,
  timestamp,
  summary,
  sentiment,
  url,
}: NewsCardProps) => {
  return (
    <Card className="p-6 bg-card border-border hover:border-primary/50 transition-all duration-300 group">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={`${sentimentColors[sentiment]} border font-semibold`}
              >
                <SentimentIcon sentiment={sentiment} />
                <span className="ml-1 capitalize">{sentiment}</span>
              </Badge>
              <span className="text-xs text-muted-foreground">{source}</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{timestamp}</span>
            </div>
            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
              {headline}
            </h3>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <ExternalLink className="h-5 w-5" />
          </a>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed break-words overflow-wrap-anywhere">{summary}</p>
      </div>
    </Card>
  );
};
