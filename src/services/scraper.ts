export interface ScrapeResult {
  title: string;
  url: string;
  content: string;
}

export class ScraperService {
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  async scrape(url: string): Promise<ScrapeResult> {
    const targetUrl = `https://r.jina.ai/${url}`;
    
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'X-Return-Format': 'markdown'
    };
    
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    try {
      const response = await fetch(targetUrl, { headers });
      
      if (!response.ok) {
        throw new Error(`Jina API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json() as any;
      
      return {
        title: data.data?.title || 'Unknown Title',
        url: data.data?.url || url,
        content: data.data?.content || ''
      };
    } catch (error: any) {
      throw new Error(`Failed to scrape URL: ${error.message}`);
    }
  }
}
