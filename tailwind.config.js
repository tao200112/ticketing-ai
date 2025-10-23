/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // PartyTix 品牌渐变主题
      colors: {
        'partytix-purple': '#7C3AED',
        'partytix-cyan': '#22D3EE',
      },
      backgroundImage: {
        'partytix-gradient': 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
      },
    },
  },
  plugins: [],
}
