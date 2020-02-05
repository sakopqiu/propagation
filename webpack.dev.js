const path = require('path');
const merge = require('webpack-merge');
const common = require('./webpack.base');

const port = 3005;

const result = merge.smart(common, {
    mode: 'development',
    devtool: 'cheap-module-eval-source-map',
    devServer: {
        host: 'localhost',
        port: port,
        inline: true,
        historyApiFallback: true,
        hot: true,
        overlay: {
            warnings: true,
            errors: true,
        },
        stats: 'errors-only',
        contentBase: path.join(__dirname, 'share'),
        https: false,
    },
});

module.exports = result;
