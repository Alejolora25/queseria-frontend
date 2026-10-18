module.exports = (config) => {
  config.set({
    frameworks: ['jasmine'],
    plugins: [require('karma-jasmine'), require('karma-chrome-launcher')],
    browsers: ['ChromeHeadlessNoGPU'],
    customLaunchers: {
      ChromeHeadlessNoGPU: {
        base: 'ChromeHeadless',
        flags: ['--disable-gpu', '--disable-dev-shm-usage', '--no-sandbox'],
      },
    },
  });
};
