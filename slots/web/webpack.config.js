const path = require("path");

const {CleanWebpackPlugin} = require("clean-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
    entry: ["./src/js/index.js", "./src/css/style.css", "./src/css/bootstrap.min.css"],
    output: {
        filename: "bundle.[contenthash].js",
        path: path.resolve(__dirname, "dist"),
    },
    performance: {
        hints: false,
    },
    devServer: {
        headers: {
            "Cache-Control": "no-store",
        },
    },
    plugins: [
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            template: "./src/index.html",
            favicon: "./src/assets/favicon.ico",
        }),
        // Copy only the logo image into the dist root (no `assets/` subfolder)
        new CopyWebpackPlugin({
            patterns: [
                { from: path.resolve(__dirname, "src/assets/logo.png"), to: "." },
            ],
        }),
        new MiniCssExtractPlugin({
            filename: "main.[contenthash].css",
        }),
    ],
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: [MiniCssExtractPlugin.loader, "css-loader"],
            },
            {
                test: /\.(png|jpg|gif|svg|mp3)$/,
                type: "asset/resource",
            },
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: "babel-loader",
            },
        ],
    },
};
