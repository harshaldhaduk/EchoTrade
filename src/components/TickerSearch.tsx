import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface TickerSearchProps {
  onSearch: (ticker: string) => void;
  isLoading: boolean;
}

export const TickerSearch = ({ onSearch, isLoading }: TickerSearchProps) => {
  const [ticker, setTicker] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ticker.trim()) {
      onSearch(ticker.trim().toUpperCase());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="relative">
        <Input
          type="text"
          placeholder="Enter stock ticker (e.g., TSLA, AAPL, MSFT)"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          className="h-14 pl-14 pr-32 text-lg bg-card border-border focus:ring-2 focus:ring-primary transition-all"
          disabled={isLoading}
        />
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Button
          type="submit"
          disabled={isLoading || !ticker.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-glow-primary"
        >
          {isLoading ? "Searching..." : "Search"}
        </Button>
      </div>
    </form>
  );
};
