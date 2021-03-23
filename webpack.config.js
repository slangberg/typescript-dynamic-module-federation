const HtmlWebpackPlugin = require("html-webpack-plugin");
const ModuleFederationPlugin = require("webpack/lib/container/ModuleFederationPlugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const package = require("./package.json");
const deps = package.dependencies;
const path = require("path");
module.exports = {
  resolve: {
    extensions: [".jsx", ".js", ".ts", ".tsx"],
  },
  output: {
    filename: "main.js",
    path: path.join(__dirname, "dist"),
  },

  entry: "./src/index",
  module: {
    rules: [
      {
        test: /bootstrap\.tsx$/,
        loader: "bundle-loader",
        options: {
          lazy: true,
        },
      },
      {
        test: /\.m?js$/,
        type: "javascript/auto",
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.jsx?$/,
        loader: require.resolve("babel-loader"),
        include: path.resolve(__dirname, "src"),
        options: {
          presets: [require.resolve("@babel/preset-react")],
        },
      },
      {
        test: /\.(png|jpe?g|gif|svg|csv)$/i,
        use: [
          {
            loader: "file-loader",
          },
        ],
      },
      {
        test: /\.(woff(2)?|ttf|eot)(\?v=\d+\.\d+\.\d+)?$/,
        use: [
          {
            loader: "file-loader",
            options: {
              name: "[name].[ext]",
              outputPath: "fonts/",
            },
          },
        ],
      },
      { test: /\.css$/i, use: ["style-loader", "css-loader"] },
      {
        test: /\.tsx?$/,
        loader: "babel-loader",
        include: path.resolve(__dirname, "src"),
        exclude: /node_modules/,
        options: {
          presets: ["@babel/preset-react", "@babel/preset-typescript"],
        },
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "test",
      filename: "remoteEntry.js",
      shared: {
        ...deps,
        react: {
          singleton: true
        },
        "react-dom": {
          singleton: true,
          requiredVersion: deps["react-dom"],
        },
      },
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "public", "index.html"),
      title: `${package.name} Tile`,
    }),
  ],
};
