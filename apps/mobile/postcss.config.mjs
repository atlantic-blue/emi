/**
 * Metro runs PostCSS over the stylesheet before NativeWind reads it, and this is what turns the
 * Tailwind at rules in global.css into the utilities the application draws with. Without it the
 * bundler passes the file through untouched and every class name reaches the phone as a name.
 */
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
