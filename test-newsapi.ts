import 'dotenv/config';
import { fetchTopHeadlines, fetchIndianNews } from './src/services/newsApi';

async function testNewsAPI() {
  console.log('Testing News API integration...\n');
  console.log('NEWS_API_KEY:', process.env.NEWS_API_KEY ? '✓ Configured' : '✗ Missing');
  
  try {
    console.log('\n1. Fetching Indian news headlines...');
    const articles = await fetchIndianNews();
    console.log(`✓ Success! Fetched ${articles.length} articles`);
    
    if (articles.length > 0) {
      console.log('\nSample article:');
      console.log('Title:', articles[0].title);
      console.log('Source:', articles[0].source.name);
      console.log('Published:', articles[0].publishedAt);
      console.log('URL:', articles[0].url);
    }
    
    console.log('\n2. Fetching business news...');
    const businessNews = await fetchTopHeadlines({ country: 'in', category: 'business', pageSize: 5 });
    console.log(`✓ Success! Fetched ${businessNews.length} business articles`);
    
    console.log('\n✓ News API integration is working correctly!');
  } catch (error: any) {
    console.error('\n✗ Error:', error.message);
    if (error.response?.data) {
      console.error('API Response:', error.response.data);
    }
  }
}

testNewsAPI();
