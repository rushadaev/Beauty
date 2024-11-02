// webpack.config.js
const path = require('path');
const nodeExternals = require('webpack-node-externals');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    // Define the mode based on NODE_ENV or default to 'development'
    mode: process.env.NODE_ENV || 'development',

    // Entry points for your application
    entry: {
        main: './src/index.ts',
        worker: './src/workers/authWorker.ts',
    },

    // Output configuration
    output: {
        filename: '[name].js', // Generates main.js and worker.js
        path: path.resolve(__dirname, 'dist'),
        clean: true, // Cleans the output directory before emit
        webassemblyModuleFilename: '[modulehash].wasm', // Naming pattern for .wasm files
    },

    // Resolve file extensions
    resolve: {
        extensions: ['.ts', '.js'],
    },

    // Exclude node_modules from the bundle
    externals: [nodeExternals({
        allowlist: [/\.wasm$/], // Allow WebAssembly files to be bundled
    })],

    // Module rules for handling different file types
    module: {
        rules: [
            // TypeScript Loader
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            // WebAssembly Loader
            {
                test: /\.wasm$/,
                type: 'asset/resource',
            },
            // Asset Modules for other assets (optional)
            {
                test: /\.(png|jpg|gif|svg|eot|ttf|woff|woff2)$/,
                type: 'asset/resource',
                generator: {
                    filename: 'assets/[hash][ext][query]',
                },
            },
            // Ignore CSS and HTML files in node_modules
            {
                test: /\.(css|html)$/,
                use: 'null-loader',
                include: /node_modules/,
            },
        ],
    },

    // Enable WebAssembly support
    experiments: {
        asyncWebAssembly: true,
    },

    // Plugins
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: path.resolve(__dirname, 'src/utils/pow/wasm_exec.js'),
                    to: path.resolve(__dirname, 'dist'),
                },
                {
                    from: path.resolve(__dirname, 'src/utils/pow/solve.wasm'),
                    to: path.resolve(__dirname, 'dist'),
                },
            ],
        }),
    ],

    // Source maps for easier debugging
    devtool: 'source-map',

    // Target environment
    target: 'node', // Ensures Node.js built-ins are available

    // Node configuration to preserve __dirname
    node: {
        __dirname: false,
        __filename: false,
    },
};
