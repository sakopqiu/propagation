const webpack = require('webpack');
const path = require('path');
const merge = require('webpack-merge');
const common = require('./webpack.base');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const prodConfig = merge.smart(common, {
    mode: 'production',
    output: {
        path: path.resolve(__dirname, 'build'),
        publicPath: '/',
        filename: '[name]-[chunkhash:8].js',
        devtoolModuleFilenameTemplate: '[absolute-resource-path]'
    },
    module: {
        rules: [
            {
                test: /mobx-react-devtools/, // 发布编译时应该移除这个模块，替换为null-loader
                use: 'null-loader',
            }
        ]
    },
    plugins: [
        new webpack.optimize.ModuleConcatenationPlugin(),
        new ExtractTextPlugin({
            filename: '[name]-[md5:contenthash:hex:8].css',
            allChunks: true
        }),
    ],
});

module.exports = prodConfig;