import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { SITE_TITLE, SITE_DESCRIPTION } from "../consts";


export async function GET(context) {
  const posts = await getCollection("posts", ({ data }) => {
  return data.draft !== true && data.language === "en";
});
  return rss({
    title: `${SITE_TITLE} (English)`,
    description: SITE_DESCRIPTION,
    site: context.site,
    trailingSlash: false,
    items: posts.map((post) => ({
      ...post.data,
      link: `/posts/${post.id}/`,
    })),
  });
}
