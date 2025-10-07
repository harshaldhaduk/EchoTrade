-- Create news_articles table to store scraped news
CREATE TABLE IF NOT EXISTS public.news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  headline TEXT NOT NULL,
  source TEXT NOT NULL,
  url TEXT NOT NULL,
  summary TEXT,
  sentiment TEXT CHECK (sentiment IN ('bullish', 'bearish', 'neutral')),
  published_at TIMESTAMP WITH TIME ZONE,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(ticker, url)
);

-- Create index for faster ticker lookups
CREATE INDEX IF NOT EXISTS idx_news_articles_ticker ON public.news_articles(ticker);
CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON public.news_articles(published_at DESC);

-- Enable RLS
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read news articles (public data)
CREATE POLICY "Anyone can read news articles"
  ON public.news_articles
  FOR SELECT
  USING (true);

-- Create search_history table to track user searches
CREATE TABLE IF NOT EXISTS public.search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  search_count INTEGER DEFAULT 1,
  last_searched_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on search_history
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read search history
CREATE POLICY "Anyone can read search history"
  ON public.search_history
  FOR SELECT
  USING (true);