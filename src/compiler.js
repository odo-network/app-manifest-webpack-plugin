import NodeTargetPlugin from 'webpack/lib/node/NodeTargetPlugin';
import LibraryTemplatePlugin from 'webpack/lib/LibraryTemplatePlugin';
import LoaderTargetPlugin from 'webpack/lib/LoaderTargetPlugin';
import SingleEntryPlugin from 'webpack/lib/SingleEntryPlugin';

import vm from 'vm';

const COMPILER_NAME = 'AppManifestPluginChild';

async function handleOptimizeChunks(chunks) {
  // console.log('Handle Optimize Chunks: ', chunks.length);
  const [chunk = {}] = chunks;
  const [file] = chunk.files;
  let result;
  try {
    const source = this.assets[file].source().replace('var APP_MANIFEST_RESULT =', '');
    const vmContext = vm.createContext({ APP_MANIFEST_PLUGIN: true, require, ...global });
    const vmScript = new vm.Script(source, { filename: './test.js' });
    result = vmScript.runInContext(vmContext);
  } catch (e) {
    console.error('[AppManifestWebpackPlugin] | [ERROR] | While Optimizing Chunks |', e);
    throw e;
  }
  result = JSON.stringify(await Promise.resolve(result.default));

  this.assets[file] = {
    map() {},
    source() {
      return result;
    },
    size() {
      return result.length;
    },
  };
}

class ChildCompiler {
  constructor(plugin, compiler, compilation) {
    this.parent = {
      plugin,
      compiler,
      compilation,
    };

    this.options = {
      filename: plugin.config.statsFilename,
      publicPath: compilation.outputOptions.publicPath,
    };

    this.compile = this.compile.bind(this);
    this.handleCache = this.handleCache.bind(this);
    this.handleRunCompiler = this.handleRunCompiler.bind(this);
  }

  async compile() {
    const { context } = this.parent.compiler;
    // Create an additional child compiler which takes the template
    // and turns it into an Node.JS html factory.
    // This allows us to use loaders during the compilation
    this.compiler = this.parent.compilation.createChildCompiler(COMPILER_NAME, this.options);
    this.compiler.context = context;

    new NodeTargetPlugin().apply(this.compiler);
    new LibraryTemplatePlugin('APP_MANIFEST_RESULT', 'var').apply(this.compiler);

    new SingleEntryPlugin(
      context,
      `!!${require.resolve('./loader.js')}?${JSON.stringify({
        ...this.parent.plugin.config,
        context,
        hash: this.compiler.hash,
      })}!${this.parent.plugin.config.logo}`,
      undefined,
    ).apply(this.compiler);

    new LoaderTargetPlugin('node').apply(this.compiler);

    this.handleCache();

    return this.handleRunCompiler();
  }

  handleCache() {
    this.compiler.hooks.compilation.tap('AppManifestPlugin', compilation => {
      if (compilation.cache) {
        if (!compilation.cache[COMPILER_NAME]) {
          compilation.cache[COMPILER_NAME] = {};
        }
        compilation.cache = compilation.cache[COMPILER_NAME];
      }
      compilation.hooks.optimizeChunkAssets.tapPromise(
        'AppManifestPluginChild',
        handleOptimizeChunks.bind(compilation),
      );
    });
  }

  handleRunCompiler() {
    return new Promise((resolve, reject) => {
      this.compiler.runAsChild((err, entries, childCompilation) => {
        if (err) return reject(err);
        if (childCompilation && childCompilation.errors && childCompilation.errors.length) {
          const errorDetails = childCompilation.errors
            .map(error => error.message + (error.error ? `:\n${error.error}` : ''))
            .join('\n');
          return reject(new Error(`Child compilation failed:\n${errorDetails}`));
        }
        const outputName = this.parent.compilation.mainTemplate.hooks.assetPath.call(this.options.filename, {
          hash: childCompilation.hash,
          chunk: entries[0],
        });
        return resolve({
          outputName,
          stats: JSON.parse(childCompilation.assets[outputName].source()),
        });
      });
    });
  }
}

export default ChildCompiler;
