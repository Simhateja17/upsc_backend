/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['react-markdown', 'remark-gfm', 'remark-parse', 'remark-rehype', 'rehype-stringify', 'unified', 'bail', 'is-plain-obj', 'trough', 'vfile', 'vfile-message', 'unist-util-stringify-position', 'mdast-util-from-markdown', 'mdast-util-to-hast', 'mdast-util-gfm', 'micromark', 'decode-named-character-reference', 'character-entities', 'hast-util-to-jsx-runtime', 'hast-util-whitespace', 'property-information', 'space-separated-tokens', 'comma-separated-tokens', 'estree-util-is-identifier-name', 'html-url-attributes', 'zwitch', 'hastscript', 'web-namespaces', 'devlop'],
  images: {
    domains: [],
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: '/upsc-final',
        destination: '/',
        permanent: false,
      },
      {
        source: '/upsc-final/:path*',
        destination: '/:path*',
        permanent: false,
      },
    ];
  },
}

module.exports = nextConfig
