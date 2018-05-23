import assert from 'assert';

import ChildCompiler from './compiler';

const getPluginConfiguration = config => ({
  statsFilename: 'app-stats.js',
  resultsFile: 'manifest-results.html',
  cache: true,
  ...config,
  favicons: {
    path: '/', // Path for overriding default icons path. `string`
    appName: null, // Your application's name. `string`
    appDescription: null, // Your application's description. `string`
    developerName: null, // Your (or your developer's) name. `string`
    developerURL: null, // Your (or your developer's) URL. `string`
    dir: 'auto', // Primary text direction for name, short_name, and description
    lang: 'en-US', // Primary language for name and short_name
    background: '#fff', // Background colour for flattened icons. `string`
    theme_color: '#fff', // Theme color user for example in Android's task switcher. `string`
    display: 'fullscreen', // Preferred display mode: "fullscreen", "standalone", "minimal-ui" or "browser". `string`
    orientation: 'any', // Default orientation: "any", "natural", "portrait" or "landscape". `string`
    start_url: '/?homescreen=1', // Start URL when launching the application from a device. `string`
    version: '1.0', // Your application's version string. `string`
    logging: false, // Print logs to console? `boolean`
    icons: {
      // Platform Options:
      // - offset - offset in percentage
      // - background:
      //   * false - use default
      //   * true - force use default, e.g. set background for Android icons
      //   * color - set background for the specified icons
      //
      android: true, // Create Android homescreen icon. `boolean` or `{ offset, background }`
      appleIcon: true, // Create Apple touch icons. `boolean` or `{ offset, background }`
      appleStartup: true, // Create Apple startup images. `boolean` or `{ offset, background }`
      coast: true, // Create Opera Coast icon. `boolean` or `{ offset, background }`
      favicons: true, // Create regular favicons. `boolean`
      firefox: true, // Create Firefox OS icons. `boolean` or `{ offset, background }`
      windows: true, // Create Windows 8 tile icons. `boolean` or `{ background }`
      yandex: true, // Create Yandex browser icon. `boolean` or `{ background }`
      ...((config.favicons || {}).icons || {}),
    },
    ...(config.favicons || {}),
  },
  disable: {
    'manifest.json': false,
    'manifest.webapp': false,
    'browserconfig.xml': false,
  },
});

class AppManifestWebpackPlugin {
  constructor(config) {
    assert(typeof config === 'object', '[AppManifestWebpackPlugin] | Expects Options to be an Object');

    this.config = getPluginConfiguration(config);

    this.apply = this.apply.bind(this);
    this.handleMakeHook = this.handleAfterHTMLProcessing.bind(this);
  }

  apply(compiler) {
    let results;
    compiler.hooks.make.tapPromise('AppManifestWebpackPlugin~Make', async compilation => {
      try {
        this.child = new ChildCompiler(this, compiler, compilation);
        results = await this.child.compile();
      } catch (e) {
        console.error('[AppManifestWebpackPlugin] | [ERROR] | ', e);
        throw e;
      }
    });
    compiler.hooks.compilation.tap('AppManifestWebpackPlugin', compilation =>
      compilation.hooks.htmlWebpackPluginAfterHtmlProcessing.tapPromise('AppManifestWebpackPlugin', data =>
        this.handleAfterHTMLProcessing(results, data).catch(err => {
          console.error(`[AppManifestWebpackPlugin] | [ERROR] | ${err.message} `, err);
          throw err;
        })));

    if (this.config.inject) {
      /* Hooks into the html-webpack-plugin to inject meta tags */
    }
  }

  async handleAfterHTMLProcessing(results, data) {
    if (results) {
      data.html = data.html.replace(/(<\/head>)/i, `${results.stats.html.join('')}$&`);
    }
  }
}

export default AppManifestWebpackPlugin;
