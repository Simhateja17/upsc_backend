import 'dotenv/config';
import { fetchEverything, fetchTopHeadlines } from './src/services/newsApi';

async function testNewsAPIDetailed() {
  console.log('Detailed News API test...\n');
  console.log('NEWS_API_KEY:', process.env.NEWS_API_KEY);
  
  try {
    console.log('\n1. Testing top headlines (no country filter)...');
    const headlinesGeneral = await fetchTopHeadlines({ pageSize: 10 });
    console.log(`Result: ${headlinesGeneral.length} articles`);
    if (headlinesGeneral.length > 0) {
      console.log('Sample:', headlinesGeneral[0].title);
    }
    
    console.log('\n2. Testing "everything" endpoint with India keyword...');
    const indiaNews = await fetchEverything({ 
      q: 'India', 
      language: 'en',
      sortBy: 'publishedAt',
      pageSize: 10 
    });
    console.log(`Result: ${indiaNews.length} articles`);
    if (indiaNews.length > 0) {
      console.log('Sample articles:');
      indiaNews.slice(0, 3).forEach((article, i) => {
        console.log(`${i + 1}. ${article.title} - ${article.source.name}`);
      });
    }
    
    console.log('\n3. Testing with specific domains...');
    const hinduNews = await fetchEverything({
      domains: 'thehindu.com',
      language: 'en',
      pageSize: 5,
      sortBy: 'publishedAt'
    });
    console.log(`Result: ${hinduNews.length} articles from The Hindu`);
    
    console.log('\n4. Testing top headlines with country=us...');
    const usNews = await fetchTopHeadlines({ country: 'us', pageSize: 5 });
    console.log(`Result: ${usNews.length} US articles`);
    
  } catch (error: any) {
    console.error('\nError:', error.message);
    if (error.response?.data) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testNewsAPIDetailed();
