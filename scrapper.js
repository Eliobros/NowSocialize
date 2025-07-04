const axios = require('axios');
const cheerio = require('cheerio');

async function scrapPosts() {
  try {
    const response = await axios.get('https://socializenow.vercel.app/posts');
    const html = response.data;
    const $ = cheerio.load(html);

    const posts = [];
    $('.post-card').each((i, el) => {
      const title = $(el).find('.post-title').text().trim();
      const author = $(el).find('.post-author').text().trim();
      const date = $(el).find('.post-date').text().trim();

      posts.push({ title, author, date });
    });

    console.log(posts);
  } catch (error) {
    console.error('Erro ao fazer scraping:', error);
  }
}

scrapPosts();
