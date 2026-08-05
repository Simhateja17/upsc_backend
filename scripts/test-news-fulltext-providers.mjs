import "dotenv/config";
import axios from "axios";

const providers = {
  newsapi: process.env.NEWS_API_KEY,
  newsdata: process.env.NEWSDATA_API_KEY,
  gnews: process.env.GNEWS_API_KEY,
  eventRegistry: process.env.EVENT_REGISTRY_API_KEY,
};

const sourceTests = [
  {
    name: "The Hindu",
    domain: "thehindu.com",
    newsdataDomain: "thehindu",
    query: "India OR government OR economy OR polity OR governance",
  },
  {
    name: "Indian Express",
    domain: "indianexpress.com",
    newsdataDomain: "indianexpress",
    query: "India OR government OR economy OR polity OR governance",
  },
];

function printArticle(article) {
  console.log(`- ${article.title || "(no title)"}`);
  console.log(`  source: ${article.source || "(unknown)"}`);
  console.log(`  url: ${article.url || "(no url)"}`);
  console.log(`  contentLength: ${article.contentLength}`);
  console.log(`  sample: ${JSON.stringify((article.sample || "").slice(0, 180))}`);
}

async function runNewsApi(test) {
  if (!providers.newsapi) return console.log("SKIP NewsAPI.org: NEWS_API_KEY missing");

  const params = new URLSearchParams({
    apiKey: providers.newsapi,
    domains: test.domain,
    q: test.query,
    language: "en",
    sortBy: "publishedAt",
    pageSize: "5",
  });

  const { data } = await axios.get(`https://newsapi.org/v2/everything?${params}`);
  console.log(`NewsAPI.org total=${data.totalResults} returned=${data.articles?.length || 0}`);
  for (const article of data.articles || []) {
    printArticle({
      title: article.title,
      source: article.source?.name,
      url: article.url,
      contentLength: article.content?.length || 0,
      sample: article.content || "",
    });
  }
}

async function runNewsData(test) {
  if (!providers.newsdata) return console.log("SKIP NewsData.io: NEWSDATA_API_KEY missing");

  const params = new URLSearchParams({
    apikey: providers.newsdata,
    domain: test.newsdataDomain,
    q: test.query,
    language: "en",
    full_content: "1",
    size: "5",
  });

  const { data } = await axios.get(`https://newsdata.io/api/1/latest?${params}`);
  const results = data.results || [];
  console.log(`NewsData.io status=${data.status} returned=${results.length} nextPage=${Boolean(data.nextPage)}`);
  for (const article of results) {
    printArticle({
      title: article.title,
      source: article.source_id || article.source_name,
      url: article.link,
      contentLength: article.content?.length || 0,
      sample: article.content || article.description || "",
    });
  }
}

async function runGNews(test) {
  if (!providers.gnews) return console.log("SKIP GNews: GNEWS_API_KEY missing");

  const params = new URLSearchParams({
    apikey: providers.gnews,
    q: `${test.query} site:${test.domain}`,
    lang: "en",
    max: "5",
    expand: "content",
  });

  const { data } = await axios.get(`https://gnews.io/api/v4/search?${params}`);
  const articles = data.articles || [];
  console.log(`GNews total=${data.totalArticles} returned=${articles.length}`);
  for (const article of articles) {
    printArticle({
      title: article.title,
      source: article.source?.name,
      url: article.url,
      contentLength: article.content?.length || 0,
      sample: article.content || article.description || "",
    });
  }
}

async function runEventRegistry(test) {
  if (!providers.eventRegistry) {
    return console.log("SKIP Event Registry: EVENT_REGISTRY_API_KEY missing");
  }

  const body = {
    action: "getArticles",
    keyword: test.query,
    sourceUri: test.domain,
    articlesPage: 1,
    articlesCount: 5,
    articlesSortBy: "date",
    articlesSortByAsc: false,
    articlesArticleBodyLen: -1,
    resultType: "articles",
    dataType: ["news"],
    lang: "eng",
    apiKey: providers.eventRegistry,
  };

  const { data } = await axios.post("https://eventregistry.org/api/v1/article/getArticles", body);
  const results = data.articles?.results || [];
  console.log(`Event Registry returned=${results.length}`);
  for (const article of results) {
    printArticle({
      title: article.title,
      source: article.source?.title || article.source?.uri,
      url: article.url,
      contentLength: article.body?.length || 0,
      sample: article.body || "",
    });
  }
}

async function runProvider(label, fn, test) {
  console.log(`\n${label}`);
  try {
    await fn(test);
  } catch (error) {
    const data = error.response?.data;
    console.log("ERROR", data ? JSON.stringify(data, null, 2) : error.message);
  }
}

for (const test of sourceTests) {
  console.log(`\n================ ${test.name} ================`);
  await runProvider("NewsAPI.org", runNewsApi, test);
  await runProvider("NewsData.io", runNewsData, test);
  await runProvider("GNews", runGNews, test);
  await runProvider("Event Registry", runEventRegistry, test);
}
