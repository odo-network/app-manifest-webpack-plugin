# App Manifest Webpack Plugin

To aid in the development of your PWA (Progressive Web Application), this plugin will take in a single icon file and automatically generate all required sizes for your various devices and engines that may need them. It will also generate your `manifest.json`, `browserconfig.xml`, and other manifest files that browsers use to render your application.

## Example

```javascript
new AppManifestWebpackPlugin({
  logo: path.resolve(rootDir, 'images', 'icon.png'),
  favicons: {
    path: 'images/[hash]/',
    appName: 'My App',
    background: '#121519',
    theme_color: '#303641',
    display: 'fullscreen',
  },
}),
```

## Favicons Config Defaults

```json
{
  "path": "/",
  "appName": null,
  "appDescription": null,
  "developerName": null,
  "developerURL": null,
  "dir": "auto",
  "lang": "en-US",
  "background": "#fff",
  "theme_color": "#fff",
  "display": "standalone",
  "orientation": "any",
  "start_url": "/?homescreen=1",
  "version": "1.0",
  "logging": false,
  "pipeHTML": false,
  "icons": {
    "android": true,
    "appleIcon": true,
    "appleStartup": true,
    "coast": true,
    "favicons": true,
    "firefox": true,
    "windows": true,
    "yandex": true
  }
}
```
