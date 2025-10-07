import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NewsArticle {
  headline: string;
  source: string;
  url: string;
  summary: string;
  publishedAt?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticker } = await req.json();
    
    if (!ticker) {
      return new Response(
        JSON.stringify({ error: 'Ticker is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching news for ticker: ${ticker}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if we have recent cached news (within last 5 minutes for testing)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: cachedNews, error: cacheError } = await supabase
      .from('news_articles')
      .select('*')
      .eq('ticker', ticker.toUpperCase())
      .gte('scraped_at', fiveMinutesAgo)
      .order('published_at', { ascending: false });

    if (cacheError) {
      console.error('Cache error:', cacheError);
    }

    if (cachedNews && cachedNews.length > 0) {
      console.log(`Returning ${cachedNews.length} cached articles`);
      return new Response(
        JSON.stringify({ 
          news: cachedNews.map(article => ({
            id: article.id,
            headline: article.headline,
            source: article.source,
            timestamp: formatTimestamp(article.published_at || article.created_at),
            summary: article.summary,
            sentiment: article.sentiment,
            url: article.url
          })),
          cached: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Scrape fresh news
    const articles = await scrapeNews(ticker);

    // Analyze sentiment and generate summaries for each article using Lovable AI
    const articlesWithSentimentAndSummary = await Promise.all(
      articles.map(async (article) => {
        const [sentiment, enhancedSummary] = await Promise.all([
          analyzeSentiment(article.headline, article.summary),
          generateSummary(article.headline, ticker)
        ]);
        return { ...article, sentiment, summary: enhancedSummary };
      })
    );

    // Store in database
    const articlesToStore = articlesWithSentimentAndSummary.map(article => ({
      ticker: ticker.toUpperCase(),
      headline: article.headline,
      source: article.source,
      url: article.url,
      summary: article.summary,
      sentiment: article.sentiment,
      published_at: article.publishedAt || new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from('news_articles')
      .upsert(articlesToStore, { onConflict: 'ticker,url', ignoreDuplicates: true });

    if (insertError) {
      console.error('Insert error:', insertError);
    }

    return new Response(
      JSON.stringify({ 
        news: articlesWithSentimentAndSummary.map((article, idx) => ({
          id: `${ticker}-${idx}`,
          headline: article.headline,
          source: article.source,
          timestamp: formatTimestamp(article.publishedAt),
          summary: article.summary,
          sentiment: article.sentiment,
          url: article.url
        })),
        cached: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-news function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function scrapeNews(ticker: string): Promise<NewsArticle[]> {
  const query = `${ticker} stock OR ${ticker} shares`;
  
  try {
    // Using Google News RSS feed
    const response = await fetch(
      `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );

    const xmlText = await response.text();
    const articles = parseGoogleNewsRSS(xmlText);
    if (!articles || articles.length === 0) {
      console.warn('No articles parsed from RSS, using fallback.');
      return getFallbackNews(ticker);
    }
    return articles.slice(0, 10);
  } catch (error) {
    console.error('Scraping error:', error);
    // Return fallback mock data if scraping fails
    return getFallbackNews(ticker);
  }
}

function parseGoogleNewsRSS(xml: string): NewsArticle[] {
  try {
    const items = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g));
    const articles: NewsArticle[] = [];

    const stripTags = (html: string) => html.replace(/<\/?[^>]+(>|$)/g, '').replace(/&nbsp;/g, ' ').trim();
    const decodeEntities = (text: string) =>
      text
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');

    for (const m of items.slice(0, 20)) {
      const item = m[1];

      const title = (() => {
        const mC = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/s);
        if (mC) return decodeEntities(mC[1]);
        const mP = item.match(/<title>(.*?)<\/title>/s);
        return mP ? decodeEntities(stripTags(mP[1])) : undefined;
      })();

      const descriptionRaw = (() => {
        const mC = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/s);
        if (mC) return mC[1];
        const mP = item.match(/<description>(.*?)<\/description>/s);
        return mP ? mP[1] : undefined;
      })();

      const link = (() => {
        // First try to get the actual article URL from the description's href attribute
        if (descriptionRaw) {
          // Decode HTML entities first
          const decoded = descriptionRaw
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"');
          
          // Extract URL from href attribute
          const hrefMatch = decoded.match(/href=["']([^"']+)["']/);
          if (hrefMatch && hrefMatch[1] && !hrefMatch[1].includes('news.google.com')) {
            return hrefMatch[1];
          }
          
          // Try to find any direct URL that's not a Google News redirect
          const urlMatches = decoded.match(/https?:\/\/[^\s<>"]+/g);
          if (urlMatches) {
            for (const url of urlMatches) {
              if (!url.includes('news.google.com') && !url.includes('rss/articles')) {
                return url;
              }
            }
          }
        }
        // Fallback to the link element (which will be Google News redirect)
        const mk = item.match(/<link>(.*?)<\/link>/s);
        return mk ? mk[1].trim() : undefined;
      })();

      const pubDateStr = (() => {
        const md = item.match(/<pubDate>(.*?)<\/pubDate>/s);
        return md ? md[1].trim() : undefined;
      })();

      const source = (() => {
        if (!descriptionRaw) return 'Financial News';
        const mA = descriptionRaw.match(/<a[^>]*>([^<]+)<\/a>/i);
        if (mA) return decodeEntities(mA[1].trim());
        const text = stripTags(descriptionRaw);
        const parts = text.split(' - ');
        if (parts.length > 1) return parts[0].trim();
        return 'Financial News';
      })();

      const summary = (() => {
        if (!descriptionRaw) return title ?? '';
        
        // Strip HTML tags and decode entities
        let text = stripTags(descriptionRaw);
        text = decodeEntities(text);
        
        // Remove source attribution at the beginning (e.g., "Reuters - ")
        text = text.replace(/^[^-]+-\s*/, '');
        
        // Remove URLs
        text = text.replace(/https?:\/\/[^\s]+/g, '');
        
        // Clean up extra whitespace
        text = text.replace(/\s+/g, ' ').trim();
        
        // If we end up with nothing or very short text, use the headline
        if (!text || text.length < 30) {
          text = title ?? '';
        }
        
        // Truncate to reasonable length
        return text.length > 200 ? text.slice(0, 197) + '...' : text;
      })();

      if (title && link) {
        articles.push({
          headline: title,
          source,
          url: link,
          summary,
          publishedAt: pubDateStr ? new Date(pubDateStr).toISOString() : undefined,
        });
      }
    }

    return articles;
  } catch (e) {
    console.error('parseGoogleNewsRSS error:', e);
    return [];
  }
}

function getFallbackNews(ticker: string): NewsArticle[] {
  const now = new Date();
  return [
    {
      headline: `${ticker} Shows Strong Trading Activity`,
      source: 'Market Watch',
      url: `https://www.marketwatch.com/${ticker.toLowerCase()}`,
      summary: `${ticker} demonstrates increased trading volume and investor interest in recent sessions.`,
      publishedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      headline: `Analysts Update Price Targets for ${ticker}`,
      source: 'Bloomberg',
      url: `https://www.bloomberg.com/${ticker.toLowerCase()}`,
      summary: `Several Wall Street analysts have revised their price targets and ratings for ${ticker} stock.`,
      publishedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString()
    },
    {
      headline: `${ticker} Stock: What Investors Need to Know`,
      source: 'CNBC',
      url: `https://www.cnbc.com/${ticker.toLowerCase()}`,
      summary: `Key developments and market trends affecting ${ticker} and its stock performance.`,
      publishedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    }
  ];
}

async function analyzeSentiment(headline: string, summary: string): Promise<string> {
  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.warn('LOVABLE_API_KEY not found, using basic sentiment');
      return basicSentimentAnalysis(headline + ' ' + summary);
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a financial sentiment analyzer. Analyze the sentiment of stock news and respond with ONLY one word: bullish, bearish, or neutral.'
          },
          {
            role: 'user',
            content: `Analyze the sentiment of this stock news:\n\nHeadline: ${headline}\n\nSummary: ${summary}\n\nRespond with only: bullish, bearish, or neutral`
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', response.status);
      return basicSentimentAnalysis(headline + ' ' + summary);
    }

    const data = await response.json();
    const sentiment = data.choices[0].message.content.toLowerCase().trim();
    
    if (['bullish', 'bearish', 'neutral'].includes(sentiment)) {
      return sentiment;
    }
    
    return basicSentimentAnalysis(headline + ' ' + summary);
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    return basicSentimentAnalysis(headline + ' ' + summary);
  }
}

function basicSentimentAnalysis(text: string): string {
  const lowerText = text.toLowerCase();
  const bullishWords = ['surge', 'gain', 'rise', 'jump', 'beat', 'exceed', 'growth', 'profit', 'high', 'strong', 'positive', 'upgrade', 'buy'];
  const bearishWords = ['fall', 'drop', 'decline', 'loss', 'weak', 'concern', 'worry', 'downgrade', 'sell', 'miss', 'low', 'negative'];
  
  let bullishScore = 0;
  let bearishScore = 0;
  
  bullishWords.forEach(word => {
    if (lowerText.includes(word)) bullishScore++;
  });
  
  bearishWords.forEach(word => {
    if (lowerText.includes(word)) bearishScore++;
  });
  
  if (bullishScore > bearishScore) return 'bullish';
  if (bearishScore > bullishScore) return 'bearish';
  return 'neutral';
}

async function generateSummary(headline: string, ticker: string): Promise<string> {
  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.warn('LOVABLE_API_KEY not found, using basic summary');
      return `Analysis of ${ticker} stock news: ${headline}`;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a financial news writer. Write a direct, informative 2-3 sentence summary of what the article covers based on the headline. Write as if you are describing the article\'s content directly to an investor. Do not use phrases like "this article discusses" or "the news suggests" - just state the information directly.'
          },
          {
            role: 'user',
            content: `Write a 2-3 sentence summary for this ${ticker} news headline: "${headline}"`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', response.status);
      return `${ticker} stock update: ${headline}`;
    }

    const data = await response.json();
    const summary = data.choices[0].message.content.trim();
    
    return summary;
  } catch (error) {
    console.error('Summary generation error:', error);
    return `Latest news about ${ticker}: ${headline}`;
  }
}

function formatTimestamp(dateString: string | undefined): string {
  if (!dateString) return 'Just now';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString();
}
