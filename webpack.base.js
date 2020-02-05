const path = require('path');
const {CheckerPlugin} = require('awesome-typescript-loader');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: {
        index: [
            './src/index.tsx',
        ]
    },
    resolve: {
        extensions: ['.webpack.js', '.web.js', '.ts', '.tsx', '.js', '.jsx'],
        // utils禁止使用alias配置！
    },

    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: [
                    {
                        loader: 'awesome-typescript-loader',
                        options: {
                            configFileName: './tsconfig.json',
                            useCache: true,
                        }
                    }
                ],
                exclude: [/\/node_modules\//],
                include: [/\/src\//],
            },
            {
                enforce: 'pre',
                test: /\.js$/,
                loader: 'source-map-loader',
                exclude: [/\/node_modules\//, /\\node_modules\\/]
            },
            {test: /\.eot$/, use: 'file-loader'},
            {test: /\.(woff|woff2)$/, use: 'url-loader'},
            {
                test: /\.(png|jpg|gif)$/,
                use: [
                    {
                        loader: 'url-loader',
                    },
                ],

            },
            {
                test: /\.(sa|sc|c)ss$/,
                use: [
                    {loader: 'style-loader'},
                    {loader: 'css-loader'},
                    {
                        loader: 'sass-loader',
                        options: {
                            implementation: require("dart-sass")
                        }
                    }
                ]
            },
            {
                test: /\.less$/,
                use: [
                    {loader: 'style-loader'},
                    {loader: 'css-loader'},
                    {
                        loader: 'less-loader',
                        options: {javascriptEnabled: true},
                    },
                ],
                include: [/\/node_modules\/antd\/es\//, /\\node_modules\\antd\\es\\/],
            },

        ]
    },
    optimization: {
        splitChunks: {
            chunks: 'all',
            cacheGroups: {
                commons: { //commons优先级默认比vendor高
                    chunks: 'initial',
                    name: 'commons',
                    minSize: 0, //只要超出0字节就生产新的包
                },
            },
        },
    },
    plugins: [
        new CheckerPlugin(),
        new HtmlWebpackPlugin({
            title: 'Propagation game',
            template: './index.html',
            filename: 'index.html',
            inject: true,
        }),
    ]
};
