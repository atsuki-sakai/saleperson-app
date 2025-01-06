export const htmlTagRemove = (HtmlString: string) =>
    HtmlString.replace(/<[^>]*>?/gm, "")
      .replace(/{%.*?%}.*?{%.*?%}/gs, "")
      .replace(/{%.*?%}/g, "")
      .replace(/{{.*?}}/g, "");