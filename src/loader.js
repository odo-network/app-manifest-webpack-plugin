import { getOptions, interpolateName } from 'loader-utils';
import validateOptions from 'schema-utils';
import { promisify } from 'util';
import Favicons from 'favicons';

import * as cache from './cache';

const favicons = promisify(Favicons);

const SCHEMA = {
  type: 'object',
  properties: {
    logo: {
      type: 'string',
    },
  },
};

export default function handleFaviconsLoader(logo) {
  const callback = this.async();
  // console.log('Loader Runs! ');

  const options = getOptions(this);

  // console.log('Options: ', options, this.options);

  validateOptions(SCHEMA, options, 'AppManifestLoader');

  if (this.cacheable) this.cacheable();
  if (!this.emitFile) throw new Error('[AppManifestLoader] | [ERROR] | emitFile is required from module system');
  if (!this.async) throw new Error('[AppManifestLoader] | [ERROR] | async is required for the loader to work');

  const contentOptions = {
    context: options.context,
    content: logo,
  };

  const prefix = interpolateName(this, options.favicons.path, contentOptions);
  const hash = interpolateName(this, '[hash]', contentOptions);

  options.favicons.path = prefix;

  const getCachedFaviconsOr = cache.get.bind(this);

  const cacheFile = `${prefix}.manifest.cache`;

  return getCachedFaviconsOr(options, cacheFile, hash, () => runFavicons(this, logo, options))
    .then(result => callback(null, `export default ${JSON.stringify(result)}`))
    .catch(err => {
      console.error('[AppManifestWebpackPlugin] | [ERROR] | While Running favicons.js | ', err);
      throw err;
    });
}

function getPublicPath(compilation) {
  let publicPath = compilation.outputOptions.publicPath || '';
  if (publicPath.length && publicPath.substr(-1) !== '/') {
    publicPath += '/';
  }
  return publicPath;
}

function escapeHTML(html) {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function runFavicons(loader, logo, options) {
  const publicPath = `${getPublicPath(loader._compilation)}`;
  const { path } = options.favicons;
  const result = await favicons(options.logo, options.favicons);

  const disabledFiles = Object.keys(options.disable).reduce((p, c) => {
    if (options.disable[c]) p.push(`/${c}`);
    return p;
  }, []);

  let html = disabledFiles.length
    ? result.html.filter(tag => !disabledFiles.some(v => tag.includes(v)))
    : result.html;

  const contentRE = new RegExp(`(content=(?="${path})[""])`, 'g');
  const hrefRE = new RegExp(`(href=(?="${path})[""])`, 'g');
  /*
    Our manifest, browserconfig, and yandex manifests are emitting
    at the top level so we need to modify the html for these
    to match.
  */
  const manifestRE = new RegExp(`(href=(?="${path}manifest.json")"[^"]*")`, 'g');
  const browserConfigRE = new RegExp(`(content=(?="${path}browserconfig.xml")"[^"]*")`, 'g');
  const yandexRE = new RegExp(`(href=(?="${path}yandex-browser-manifest.json")"[^"]*")`, 'g');

  html = html.map(entry =>
    entry
      .replace(manifestRE, `href="${publicPath}manifest.json"`)
      .replace(browserConfigRE, `content="${publicPath}browserconfig.xml"`)
      .replace(yandexRE, `href="${publicPath}yandex-browser-manifest.json"`)
      .replace(contentRE, `$1${publicPath}`)
      .replace(hrefRE, `$1${publicPath}`));

  const response = {
    path,
    html,
    files: [],
  };

  result.images.forEach(image => {
    const filePath = path + image.name;
    response.files.push(filePath);
    loader.emitFile(filePath, image.contents);
  });
  result.files.forEach(file => {
    if (options.disable[file.name]) return;
    const filePath = file.name;
    response.files.push(filePath);
    loader.emitFile(filePath, file.contents);
  });

  if (options.resultsFile) {
    response.files.push(options.resultsFile);
    loader.emitFile(`${options.resultsFile}`, `<pre>${escapeHTML(JSON.stringify(html, null, 2))}</pre>`);
  }

  return response;
}
